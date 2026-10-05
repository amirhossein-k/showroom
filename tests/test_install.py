import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys

BASE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("installer", BASE / "install.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

# Exact server-page source retrieved from public GitHub.
PAGE = """import { connectDB, plain } from '@/lib/db';
import { Transaction, Car, Cheque } from '@/lib/models';
import { loadOverview } from '@/lib/overview';
import CashflowClient from '@/components/CashflowClient';
export const dynamic = 'force-dynamic';
export default async function CashflowPage() {
  await connectDB();
  const [t, cars, q, o] = await Promise.all([Transaction.find({}).populate('car', 'brand model year').sort({ date: -1 }).lean(), Car.find({}, 'brand model year').sort({ createdAt: -1 }).lean(), Cheque.find({ status: 'pending' }).sort({ dueDate: 1 }).lean(), loadOverview()]);
  return <CashflowClient transactions={plain(t)} cars={plain(cars)} cheques={plain(q)} stats={o.stats} />;
}
"""
# Small representative client fixture, not the whole production client.
CLIENT = """'use client';
import CashflowPrint from './CashflowPrint';
export default function CashflowClient({ transactions = [], cars = [], cheques = [], stats = {} }) {
  return <>
      <Section className="mt-5" title="تراکنش‌ها" action={null}>ledger</Section>
  </>;
}
"""

class InstallerTests(unittest.TestCase):
    def fixture(self, root):
        for name, text in (("app/cashflow/page.js", PAGE), ("components/CashflowClient.jsx", CLIENT)):
            (root/name).parent.mkdir(parents=True, exist_ok=True)
            (root/name).write_text(text, encoding="utf-8")

    def fixture_hashes(self):
        return {"app/cashflow/page.js": m.git_sha(PAGE.encode()),
                "components/CashflowClient.jsx": m.git_sha(CLIENT.encode())}

    def test_exact_server_page_hash(self):
        self.assertEqual(m.git_sha(PAGE.encode()), m.EXPECTED["app/cashflow/page.js"])

    def test_server_page_patch(self):
        text = m.patch_page(PAGE)
        self.assertIn("Contract.find", text)
        self.assertIn("receivables={receivables}", text)
        self.assertIn("transactions={plain(t)}", text)

    def test_client_patch_patterns(self):
        text = m.patch_client(CLIENT)
        self.assertEqual(text.count("<ReceivablesPanel"), 1)
        self.assertIn("receivables = []", text)
        self.assertIn(">ledger</Section>", text)

    def test_missing_pattern_fails(self):
        with self.assertRaises(ValueError):
            m.patch_client(CLIENT.replace("تراکنش‌ها", "different"))

    def test_unknown_version_fails_without_write(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.fixture(root)
            before = {str(p.relative_to(root)):p.read_bytes() for p in root.rglob("*") if p.is_file()}
            with self.assertRaises(ValueError):
                m.plan(root)
            after = {str(p.relative_to(root)):p.read_bytes() for p in root.rglob("*") if p.is_file()}
            self.assertEqual(before, after)

    def test_preview_does_not_write(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.fixture(root)
            with patch.object(m, "EXPECTED", self.fixture_hashes()), patch.object(sys, "argv", ["install.py", "--root", d]):
                m.main()
            self.assertEqual((root/"app/cashflow/page.js").read_text(), PAGE)
            self.assertFalse((root/"components/ReceivablesPanel.jsx").exists())

    def test_apply_backup_and_repeat_refusal(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.fixture(root)
            with patch.object(m, "EXPECTED", self.fixture_hashes()), patch.object(sys, "argv", ["install.py", "--root", d, "--apply"]):
                m.main()
                backup = next(root.glob(".receivables-backup-*"))
                self.assertEqual((backup/"app/cashflow/page.js").read_text(), PAGE)
                self.assertEqual((backup/"components/CashflowClient.jsx").read_text(), CLIENT)
                self.assertTrue((root/"lib/receivables.js").exists())
                with self.assertRaises(ValueError):
                    m.plan(root)

if __name__ == "__main__":
    unittest.main()
