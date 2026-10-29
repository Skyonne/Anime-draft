"""Synthetic fixtures only: no third-party portrait or fabricated permission."""
import io
import unittest
import importlib.util
from pathlib import Path
from PIL import Image
spec = importlib.util.spec_from_file_location('prepare_portrait', Path(__file__).with_name('prepare-portrait.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
optimize = module.optimize

class PortraitOptimizationTests(unittest.TestCase):
    def test_webp_ratio_dimensions_and_metadata(self):
        source = io.BytesIO()
        image = Image.new('RGB', (900, 600), (180, 120, 80))
        image.save(source, format='PNG', icc_profile=b'test metadata')
        source.seek(0)
        data, quality = optimize(source)
        with Image.open(io.BytesIO(data)) as result:
            self.assertEqual(result.format, 'WEBP')
            self.assertEqual(result.size, (400, 500))
            self.assertNotIn('icc_profile', result.info)
            self.assertNotIn('exif', result.info)
        self.assertLessEqual(len(data), 120000)
        self.assertGreaterEqual(quality, 40)

    def test_transparency_is_preserved(self):
        source = io.BytesIO()
        Image.new('RGBA', (500, 800), (20, 30, 40, 80)).save(source, format='PNG')
        source.seek(0)
        data, _ = optimize(source)
        with Image.open(io.BytesIO(data)) as result:
            self.assertIn('A', result.getbands())

    def test_animation_is_rejected(self):
        source = io.BytesIO()
        first = Image.new('RGB', (40, 50), 'red')
        first.save(source, format='GIF', save_all=True, append_images=[Image.new('RGB', (40, 50), 'blue')])
        source.seek(0)
        with self.assertRaises(ValueError):
            optimize(source)

if __name__ == '__main__':
    unittest.main()
