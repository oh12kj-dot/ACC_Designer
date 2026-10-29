import unittest
import importlib.util
import pathlib
import numpy as np

spec = importlib.util.spec_from_file_location('closed_loop', pathlib.Path(__file__).with_name('new-input-grabcut-closed-loop.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def rectangle(x1, y1, x2, y2):
    mask = np.zeros((96, 96), bool)
    mask[y1:y2 + 1, x1:x2 + 1] = True
    return mask


class TopologyTests(unittest.TestCase):
    def setUp(self):
        self.outer = rectangle(6, 6, 90, 90)
        self.core = rectangle(45, 35, 55, 50)
        self.exterior = rectangle(8, 8, 12, 12)
        self.seeds = [rectangle(32, 38, 38, 50), rectangle(62, 38, 68, 50)]
        self.envelopes = [rectangle(28, 33, 42, 57), rectangle(58, 33, 72, 57)]
        self.witnesses = [rectangle(28, 25, 72, 29), rectangle(28, 62, 72, 66)]
        self.fg = rectangle(20, 20, 80, 80)
        self.fg[rectangle(30, 35, 40, 55) | rectangle(60, 35, 70, 55)] = False

    def run_mask(self, fg):
        return worker.validate_topology(fg, self.outer, self.core, self.exterior, self.seeds, self.envelopes, self.witnesses)

    def test_two_seeded_openings_and_one_foreground(self):
        self.assertEqual(len(self.run_mask(self.fg)), 2)

    def test_filled_extra_or_leaking_openings_rejected(self):
        for mutate in [lambda a: a.__setitem__(rectangle(30, 35, 40, 55), True), lambda a: a.__setitem__(rectangle(73, 70, 76, 73), False), lambda a: a.__setitem__(rectangle(0, 43, 35, 46), False), lambda a: a.__setitem__(rectangle(38, 43, 63, 46), False)]:
            a = self.fg.copy()
            mutate(a)
            with self.assertRaises(ValueError):
                self.run_mask(a)

    def test_hole_outside_its_envelope_rejected(self):
        a = self.fg.copy()
        a[rectangle(30, 30, 40, 35)] = False
        with self.assertRaisesRegex(ValueError, 'ENVELOPE'):
            self.run_mask(a)

    def test_missing_or_thinned_witness_and_foreign_fragment_rejected(self):
        for mutate in [lambda a: a.__setitem__((25, 35), False), lambda a: a.__setitem__(rectangle(48, 20, 52, 80), False), lambda a: a.__setitem__(rectangle(85, 75, 87, 77), True)]:
            a = self.fg.copy()
            mutate(a)
            with self.assertRaises(ValueError):
                self.run_mask(a)


if __name__ == '__main__':
    unittest.main()
