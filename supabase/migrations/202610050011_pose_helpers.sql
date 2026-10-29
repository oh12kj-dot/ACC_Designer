-- Internal pose/occupancy helpers. Atomic Save still retains its geometry gate.
create function public._design_angle(v double precision) returns double precision
language plpgsql immutable set search_path = '' as $$
begin
 if v is null or v in ('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision) then raise exception 'INVALID_GEOMETRY_NUMBER'; end if;
 return v-floor(v/360)*360;
end; $$;
create function public._design_node_point(n jsonb, part jsonb, x_norm double precision, y_norm double precision, flip_x boolean) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare w double precision := (part->>'width_mm')::double precision; h double precision := (part->>'height_mm')::double precision;
 sx double precision := (n->>'scale_x')::double precision; sy double precision := (n->>'scale_y')::double precision;
 angle_ double precision := radians(public._design_angle((n->>'rotation_deg')::double precision)); dx double precision; dy double precision; field text;
begin
 foreach field in array array['x_mm','y_mm','rotation_deg','scale_x','scale_y'] loop
  if jsonb_typeof(n->field) is distinct from 'number' then raise exception 'INVALID_NODE_NUMBER'; end if;
 end loop;
 if jsonb_typeof(part->'width_mm') is distinct from 'number' or jsonb_typeof(part->'height_mm') is distinct from 'number' or w is null or h is null or w<=0 or h<=0 or sx<=0 or sy<=0 or x_norm is null or y_norm is null or x_norm<0 or x_norm>1 or y_norm<0 or y_norm>1 or flip_x is null then raise exception 'INVALID_NODE_GEOMETRY'; end if;
 dx := ((case when flip_x then 1-x_norm else x_norm end)-.5)*w*sx; dy := (y_norm-.5)*h*sy;
 return jsonb_build_object('x',(n->>'x_mm')::double precision+dx*cos(angle_)-dy*sin(angle_),'y',(n->>'y_mm')::double precision+dx*sin(angle_)+dy*cos(angle_));
end; $$;
create function public._design_through_pose(n jsonb,part jsonb,hole jsonb,sample jsonb,flip_x boolean,flip_180 boolean) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare axis_ double precision := (hole->>'axis_deg')::double precision; rotation_ double precision; posed jsonb; offset_ jsonb;
begin
 if flip_x then axis_ := public._design_angle(180-axis_); end if;
 if flip_180 is null then raise exception 'INVALID_THROUGH_FLIP'; end if;
 rotation_ := public._design_angle(degrees(atan2((sample->>'tangent_y')::double precision,(sample->>'tangent_x')::double precision))-axis_+case when flip_180 then 180 else 0 end);
 posed := n||jsonb_build_object('x_mm',0,'y_mm',0,'rotation_deg',rotation_);
 offset_ := public._design_node_point(posed,part,((hole->>'entry_x_norm')::double precision+(hole->>'exit_x_norm')::double precision)/2,((hole->>'entry_y_norm')::double precision+(hole->>'exit_y_norm')::double precision)/2,flip_x);
 return jsonb_build_object('x_mm',(sample->>'x')::double precision-(offset_->>'x')::double precision,'y_mm',(sample->>'y')::double precision-(offset_->>'y')::double precision,'rotation_deg',rotation_);
end; $$;
create function public._design_through_interval(n jsonb,part jsonb,hole jsonb,sample jsonb,distance_mm double precision,flip_x boolean) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare center_ jsonb; corner_ jsonb; projection double precision; minimum_ double precision := 'Infinity'; maximum_ double precision := '-Infinity'; x_ integer; y_ integer;
begin
 center_ := public._design_node_point(n,part,((hole->>'entry_x_norm')::double precision+(hole->>'exit_x_norm')::double precision)/2,((hole->>'entry_y_norm')::double precision+(hole->>'exit_y_norm')::double precision)/2,flip_x);
 for x_ in 0..1 loop for y_ in 0..1 loop
  corner_ := public._design_node_point(n,part,x_,y_,flip_x);
  projection := ((corner_->>'x')::double precision-(center_->>'x')::double precision)*(sample->>'tangent_x')::double precision+((corner_->>'y')::double precision-(center_->>'y')::double precision)*(sample->>'tangent_y')::double precision;
  minimum_ := least(minimum_,projection); maximum_ := greatest(maximum_,projection);
 end loop; end loop;
 return jsonb_build_object('start_mm',distance_mm+minimum_,'end_mm',distance_mm+maximum_);
end; $$;
create function public._design_anchor_pose(n jsonb,part jsonb,point_ jsonb,sample jsonb,attachment jsonb,flip_x boolean) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare tangent_deg double precision := degrees(atan2((sample->>'tangent_y')::double precision,(sample->>'tangent_x')::double precision));
 offset_mm double precision := (attachment->>'normal_offset_mm')::double precision; rotation_offset double precision := (attachment->>'rotation_offset_deg')::double precision;
 direction_ double precision := (point_->>'direction_deg')::double precision; body_ double precision; rotation_ double precision; position_ jsonb;
begin
 if flip_x then direction_ := public._design_angle(180-direction_); end if;
 if attachment->>'orientation_mode'='keep_rotation' then rotation_ := (n->>'rotation_deg')::double precision;
 else
  if attachment->>'orientation_mode'='world_down' then body_:=90;
  elsif attachment->>'orientation_mode'='path_tangent' then body_:=tangent_deg;
  elsif attachment->>'orientation_mode'='path_normal' then body_:=tangent_deg+case when offset_mm<0 then -90 else 90 end;
  else raise exception 'INVALID_ANCHOR_ORIENTATION'; end if;
  rotation_:=public._design_angle(body_+180-direction_+rotation_offset);
 end if;
 position_:=public._design_node_point(n||jsonb_build_object('x_mm',0,'y_mm',0,'rotation_deg',rotation_),part,(point_->>'x_norm')::double precision,(point_->>'y_norm')::double precision,flip_x);
 return jsonb_build_object('x_mm',(sample->>'x')::double precision-(sample->>'tangent_y')::double precision*offset_mm-(position_->>'x')::double precision,'y_mm',(sample->>'y')::double precision+(sample->>'tangent_x')::double precision*offset_mm-(position_->>'y')::double precision,'rotation_deg',rotation_);
end; $$;
revoke all on function public._design_angle(double precision) from public,anon,authenticated;
revoke all on function public._design_node_point(jsonb,jsonb,double precision,double precision,boolean) from public,anon,authenticated;
revoke all on function public._design_through_pose(jsonb,jsonb,jsonb,jsonb,boolean,boolean) from public,anon,authenticated;
revoke all on function public._design_through_interval(jsonb,jsonb,jsonb,jsonb,double precision,boolean) from public,anon,authenticated;
revoke all on function public._design_anchor_pose(jsonb,jsonb,jsonb,jsonb,jsonb,boolean) from public,anon,authenticated;
