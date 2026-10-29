-- Internal geometry helpers only. The Design save gate remains in place until
-- ownership, attachment, occupancy and Mirror validation are integrated.
create function public._design_path_geometry(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare ax double precision; ay double precision; bx double precision; by_ double precision;
  dx double precision; dy double precision; chord double precision; physical double precision;
  nx double precision; ny double precision; side double precision; shape text;
  low double precision := 0; high double precision; sag double precision := 0;
  offset_ double precision; x_ double precision; y_ double precision; previous_x double precision; previous_y double precision;
  length_ double precision; t double precision; i integer; iteration integer; count_ integer;
  points jsonb := '[]'; cumulative jsonb := '[0]'; field text;
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'INVALID_PATH'; end if;
  foreach field in array array['start_x_mm','start_y_mm','end_x_mm','end_y_mm','physical_length_mm'] loop
    if jsonb_typeof(p->field) is distinct from 'number' then raise exception 'INVALID_PATH_NUMBER'; end if;
  end loop;
  ax := (p->>'start_x_mm')::double precision; ay := (p->>'start_y_mm')::double precision;
  bx := (p->>'end_x_mm')::double precision; by_ := (p->>'end_y_mm')::double precision; physical := (p->>'physical_length_mm')::double precision;
  dx := bx-ax; dy := by_-ay; chord := sqrt(dx*dx+dy*dy); shape := p->>'shape';
  if physical <= 0 or chord <= 1e-9 or chord > physical+1e-7 then raise exception 'INVALID_PATH_LENGTH'; end if;
  if shape = 'straight' then
    if abs(chord-physical)>1e-7 then raise exception 'STRAIGHT_LENGTH_MISMATCH'; end if;
    return jsonb_build_object('points',jsonb_build_array(jsonb_build_array(ax,ay),jsonb_build_array(bx,by_)),'cumulative',jsonb_build_array(0,chord),'arc_length_mm',chord);
  end if;
  if shape is null or shape not in ('u','v') then raise exception 'INVALID_PATH_SHAPE'; end if;
  if jsonb_typeof(p->'bend_side') is distinct from 'number' or (p->>'bend_side')::numeric not in (-1,1) then raise exception 'INVALID_BEND_SIDE'; end if;
  if abs(dx)<1e-7 then raise exception 'VERTICAL_UV_DESIGN_PENDING'; end if;
  side := (p->>'bend_side')::double precision * case when dx>0 then 1 else -1 end;
  nx := -dy/chord*side; ny := dx/chord*side;
  if shape='v' then
    offset_ := sqrt(greatest(0,physical*physical-chord*chord))/2;
    x_ := (ax+bx)/2+offset_*nx; y_ := (ay+by_)/2+offset_*ny;
    length_ := sqrt((x_-ax)^2+(y_-ay)^2);
    return jsonb_build_object('points',jsonb_build_array(jsonb_build_array(ax,ay),jsonb_build_array(x_,y_),jsonb_build_array(bx,by_)),'cumulative',jsonb_build_array(0,length_,length_+sqrt((bx-x_)^2+(by_-y_)^2)),'arc_length_mm',length_+sqrt((bx-x_)^2+(by_-y_)^2));
  end if;
  high := physical;
  for iteration in 1..32 loop
    sag := (low+high)/2; length_ := 0; previous_x := ax; previous_y := ay;
    for i in 1..256 loop
      t := i::double precision/256; offset_ := 4*sag*t*(1-t);
      x_ := ax+dx*t+nx*offset_; y_ := ay+dy*t+ny*offset_;
      length_ := length_+sqrt((x_-previous_x)^2+(y_-previous_y)^2); previous_x := x_; previous_y := y_;
    end loop;
    exit when abs(length_-physical)<=greatest(1e-6,physical*1e-8);
    if length_<physical then low := sag; else high := sag; end if;
  end loop;
  if abs(length_-physical)>greatest(.5,physical*.005) then raise exception 'PATH_SOLVER_NOT_CONVERGED'; end if;
  points := jsonb_build_array(jsonb_build_array(ax,ay)); length_ := 0; previous_x := ax; previous_y := ay;
  for i in 1..256 loop
    t := i::double precision/256; offset_ := 4*sag*t*(1-t);
    x_ := ax+dx*t+nx*offset_; y_ := ay+dy*t+ny*offset_;
    if i=256 then x_ := bx; y_ := by_; end if;
    length_ := length_+sqrt((x_-previous_x)^2+(y_-previous_y)^2);
    points := points||jsonb_build_array(jsonb_build_array(x_,y_)); cumulative := cumulative||jsonb_build_array(length_);
    previous_x := x_; previous_y := y_;
  end loop;
  return jsonb_build_object('points',points,'cumulative',cumulative,'arc_length_mm',length_);
end;
$$;

create function public._design_path_sample(g jsonb, distance_mm double precision, physical_length_mm double precision) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare distance_ double precision; i integer; low integer := 1; high integer; mid integer;
  ax double precision; ay double precision; bx double precision; by_ double precision; segment double precision; t double precision;
begin
  if distance_mm is null or physical_length_mm is null or distance_mm in ('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision) or physical_length_mm in ('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision) or physical_length_mm<=0 or distance_mm<0 or distance_mm>physical_length_mm+1e-6 then raise exception 'INVALID_PATH_DISTANCE'; end if;
  distance_ := least(distance_mm,physical_length_mm)/physical_length_mm*(g->>'arc_length_mm')::double precision;
  high := jsonb_array_length(g->'points')-1;
  if high<1 then raise exception 'INVALID_PATH_GEOMETRY'; end if;
  while low<high loop
    mid := (low+high)/2;
    if (g->'cumulative'->>mid)::double precision<distance_ then low:=mid+1; else high:=mid; end if;
  end loop;
  i := low; ax := (g->'points'->(i-1)->>0)::double precision; ay := (g->'points'->(i-1)->>1)::double precision;
  bx := (g->'points'->i->>0)::double precision; by_ := (g->'points'->i->>1)::double precision; segment := sqrt((bx-ax)^2+(by_-ay)^2);
  if segment<=0 then raise exception 'INVALID_PATH_TANGENT'; end if;
  t := (distance_-(g->'cumulative'->>(i-1))::double precision)/segment;
  return jsonb_build_object('x',ax+(bx-ax)*t,'y',ay+(by_-ay)*t,'tangent_x',(bx-ax)/segment,'tangent_y',(by_-ay)/segment);
end;
$$;
revoke all on function public._design_path_geometry(jsonb) from public,anon,authenticated;
revoke all on function public._design_path_sample(jsonb,double precision,double precision) from public,anon,authenticated;
