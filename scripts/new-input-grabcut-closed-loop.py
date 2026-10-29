"""Finite, reviewed opaque loop alpha only. Never generates source RGB."""
import base64
import hashlib
import json
import pathlib
import sys
import cv2
import numpy as np


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def runtime():
    root = pathlib.Path(cv2.__file__).parent
    nr = pathlib.Path(np.__file__).parent
    paths = [pathlib.Path(sys.executable), pathlib.Path(__file__), *root.rglob('*.pyd'), *root.rglob('*.dll'), *nr.rglob('*.pyd')]
    libs = nr.parent / 'numpy.libs'
    if libs.exists():
        paths.extend(libs.rglob('*.dll'))
    paths.extend(p for p in [root / 'LICENSE.txt', root / 'LICENSE-3RD-PARTY.txt'] if p.exists())
    return {'python': sys.version, 'executable': sys.executable, 'opencv': cv2.__version__, 'numpy': np.__version__, 'files': {str(p.resolve()): sha(p) for p in sorted(set(paths))}}


def polygon(value, width, height):
    if not isinstance(value, list) or not 3 <= len(value) <= 16 or any(not isinstance(p, list) or len(p) != 2 or any(type(v) != int for v in p) or not 1 < p[0] < width - 2 or not 1 < p[1] < height - 2 for p in value):
        raise ValueError('CLOSED_LOOP_POLYGON')
    arr = np.zeros((height, width), np.uint8)
    cv2.fillPoly(arr, [np.asarray(value, np.int32)], 1)
    return arr.astype(bool)


def validate_topology(fg, outer, core, exterior_seeds, opening_seeds, envelopes, witnesses):
    if np.any(fg & exterior_seeds) or np.any(fg & ~outer) or not np.all(fg[core]) or any(not np.all(fg[w]) for w in witnesses):
        raise ValueError('CLOSED_LOOP_SEED_CHANGED')
    if np.any(fg[0, :]) or np.any(fg[-1, :]) or np.any(fg[:, 0]) or np.any(fg[:, -1]):
        raise ValueError('CLOSED_LOOP_BORDER')
    area = int(np.count_nonzero(fg))
    if not fg.size * .01 <= area <= fg.size * .8 or area < np.count_nonzero(core) * 1.05:
        raise ValueError('CLOSED_LOOP_AREA_OR_CORE_ONLY')
    interior = cv2.erode(outer.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    if np.any(fg & ~interior):
        raise ValueError('CLOSED_LOOP_ROI_BOUNDARY')
    components, _ = cv2.connectedComponents(fg.astype(np.uint8), connectivity=8)
    if components != 2:
        raise ValueError('CLOSED_LOOP_FOREGROUND_COMPONENTS')
    count, labels = cv2.connectedComponents((~fg).astype(np.uint8), connectivity=4)
    exterior = set(int(n) for n in np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]]) if n)
    enclosed = set(range(1, count)) - exterior
    if len(enclosed) != len(opening_seeds):
        raise ValueError('CLOSED_LOOP_OPENING_COUNT')
    if any(int(n) not in exterior for n in labels[exterior_seeds]):
        raise ValueError('CLOSED_LOOP_EXTERIOR_SEED_ENCLOSED')
    seen, results = set(), []
    for i, (seed, envelope) in enumerate(zip(opening_seeds, envelopes)):
        ids = set(int(n) for n in labels[seed])
        if len(ids) != 1 or not ids <= enclosed or ids & seen:
            raise ValueError('CLOSED_LOOP_SEED_LEAK_OR_MERGE')
        label = next(iter(ids))
        component = labels == label
        if np.any(component & ~envelope) or any(np.any(component & other) for j, other in enumerate(envelopes) if j != i):
            raise ValueError('CLOSED_LOOP_OPENING_ENVELOPE')
        seen.add(label)
        results.append({'openingIndex': i, 'backgroundPixels': int(np.count_nonzero(component)), 'componentSha256': hashlib.sha256(component.astype(np.uint8).tobytes()).hexdigest()})
    if seen != enclosed:
        raise ValueError('CLOSED_LOOP_UNREVIEWED_PUNCHOUT')
    return results


def run(request):
    if request.get('runtime') != runtime():
        raise ValueError('CLOSED_LOOP_RUNTIME_CHANGED')
    if request.get('iterations') != 5 or request.get('seed') != 0 or request.get('threads') != 1:
        raise ValueError('CLOSED_LOOP_PARAMETERS')
    width, height, expected = request.get('width'), request.get('height'), request.get('expectedOpenings')
    if type(width) != int or type(height) != int or not 8 <= width <= 4096 or not 8 <= height <= 4096 or width * height > 16777216 or type(expected) != int or not 1 <= expected <= 4:
        raise ValueError('CLOSED_LOOP_SIZE_OR_COUNT')
    raw = base64.b64decode(request['rgba'], validate=True)
    if len(raw) != width * height * 4:
        raise ValueError('CLOSED_LOOP_BYTES')
    rgba = np.frombuffer(raw, dtype=np.uint8).reshape(height, width, 4)
    if np.any(rgba[:, :, 3] != 255):
        raise ValueError('CLOSED_LOOP_ALPHA_INPUT')
    outer, core = polygon(request['outer'], width, height), polygon(request['core'], width, height)
    background, openings, bridges = request.get('background'), request.get('openings'), request.get('bridgeWitnesses')
    if not isinstance(background, list) or not 1 <= len(background) <= 16 or not isinstance(openings, list) or len(openings) != expected or not isinstance(bridges, list) or not 1 <= len(bridges) <= 16:
        raise ValueError('CLOSED_LOOP_REVIEW_SETS')
    exterior_seeds = np.zeros((height, width), bool)
    for region in background:
        exterior_seeds |= polygon(region, width, height)
    witnesses = [polygon(p, width, height) for p in bridges]
    sure_fg = core.copy()
    for witness in witnesses:
        if np.count_nonzero(witness) < 3:
            raise ValueError('CLOSED_LOOP_BRIDGE_WITNESS')
        sure_fg |= witness
    opening_seeds = [polygon(o['backgroundSeed'], width, height) for o in openings]
    envelopes = [polygon(o['reviewedOpeningEnvelope'], width, height) for o in openings]
    if np.any(sure_fg & ~outer) or np.count_nonzero(core) < 9 or np.count_nonzero(exterior_seeds) < 9 or np.any(sure_fg & exterior_seeds):
        raise ValueError('CLOSED_LOOP_CORE_OR_BACKGROUND')
    all_background = exterior_seeds.copy()
    for i, (seed, envelope) in enumerate(zip(opening_seeds, envelopes)):
        if np.count_nonzero(seed) < 9 or np.any(seed & ~envelope) or np.any(envelope & ~outer) or np.any(seed & all_background) or np.any(seed & sure_fg) or any(np.any(envelope & prior) for prior in envelopes[:i]):
            raise ValueError('CLOSED_LOOP_OPENING_SEED_CONFLICT')
        all_background |= seed
    mask = np.full((height, width), cv2.GC_BGD, np.uint8)
    mask[outer] = cv2.GC_PR_FGD
    mask[sure_fg] = cv2.GC_FGD
    mask[all_background] = cv2.GC_BGD
    if np.count_nonzero((~outer) | all_background) < 24:
        raise ValueError('CLOSED_LOOP_BACKGROUND')
    cv2.setNumThreads(1)
    cv2.setRNGSeed(0)
    cv2.grabCut(np.ascontiguousarray(rgba[:, :, :3][:, :, ::-1]), mask, None, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 5, cv2.GC_INIT_WITH_MASK)
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    results = validate_topology(fg, outer, core, exterior_seeds, opening_seeds, envelopes, witnesses)
    alpha = (fg.astype(np.uint8) * 255).tobytes()
    return {'alpha': base64.b64encode(alpha).decode('ascii'), 'alphaSha256': hashlib.sha256(alpha).hexdigest(), 'inputRgbaSha256': hashlib.sha256(raw).hexdigest(), 'foregroundPixels': int(np.count_nonzero(fg)), 'components': 1, 'holes': expected, 'openings': results}


if __name__ == '__main__':
    print(json.dumps(runtime(), sort_keys=True) if '--describe' in sys.argv else json.dumps(run(json.load(sys.stdin))))
