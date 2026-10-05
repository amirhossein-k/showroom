#!/usr/bin/env python3
"""Run from project root; --apply writes changes with backups."""
import argparse
import hashlib
from pathlib import Path
import shutil
from datetime import datetime
import sys
BASE = Path(__file__).resolve().parent
EXPECTED = {
    "components/CashflowClient.jsx": "b61266d973134394ebc0165ed2f7e2f8a62b82cc",
    "app/cashflow/page.js": "d943c3f8054df378dec71adbbbc16fcae402c5e7",
}
def git_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError("Source pattern missing or repeated. No files changed.")
    return text.replace(old,new,1)
def patch_client(text):
    text = once(text,"import CashflowPrint from './CashflowPrint';",
        "import CashflowPrint from './CashflowPrint';\nimport ReceivablesPanel from './ReceivablesPanel';")
    text = once(text,"cheques = [], stats = {} })","cheques = [], stats = {}, receivables = [] })")
    return once(text,'      <Section className="mt-5" title="تراکنش‌ها" action={',
        '      <ReceivablesPanel receivables={receivables} cars={cars} />\n'
        '      <Section className="mt-5" title="تراکنش‌ها" action={')
def patch_page(text):
    text = once(text,"import { Transaction, Car, Cheque }","import { Transaction, Car, Cheque, Contract }")
    text = once(text,"import { loadOverview } from '@/lib/overview';",
        "import { loadOverview } from '@/lib/overview';\nimport { buildReceivableRows } from '@/lib/receivables';")
    text = once(text,"  return <CashflowClient",
        "  // Receivables patch: only pass fields needed by the panel.\n"
        "  const signedContracts = o.receivables.length\n"
        "    ? plain(await Contract.find({ car: { $in: o.receivables.map((c) => c._id) }, status: 'signed' })\n"
        "        .select('car number buyer.name status').sort({ signedAt: -1, _id: -1 }).lean())\n"
        "    : [];\n"
        "  const receivables = buildReceivableRows(o.receivables, signedContracts, plain(q));\n"
        "  return <CashflowClient")
    return once(text,"stats={o.stats} />;","stats={o.stats} receivables={receivables} />;")
def plan(root):
    changes = {}
    for name,expected in EXPECTED.items():
        data = (root/name).read_bytes()
        if git_sha(data) != expected:
            raise ValueError(f"{name}: version differs from reviewed main. No files changed. Merge manually using README.fa.md.")
        text = data.decode('utf-8')
        changes[name] = patch_client(text) if name.endswith('CashflowClient.jsx') else patch_page(text)
    for name in ('components/ReceivablesPanel.jsx','lib/receivables.js'):
        if (root/name).exists():
            raise ValueError(f"{name} already exists. No files changed.")
        changes[name] = (BASE/name).read_text(encoding='utf-8')
    return changes
def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root',type=Path,default=Path.cwd())
    p.add_argument('--apply',action='store_true')
    args = p.parse_args()
    root = args.root.resolve()
    try:
        changes = plan(root)
    except (OSError,ValueError) as e:
        sys.exit(str(e))
    print('Changes: 2 existing files, 2 new files. No database/schema changes.')
    for name in changes: print('  '+name)
    if not args.apply:
        print('Preview only. Apply with: python3 path/to/install.py --apply')
        return
    backup = root/('.receivables-backup-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir()
    applied = []
    try:
        for name in EXPECTED:
            dest = backup/name
            dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(root/name,dest)
        for name,text in changes.items():
            path = root/name
            path.parent.mkdir(parents=True,exist_ok=True)
            applied.append(name)
            path.write_text(text,encoding='utf-8')
    except Exception:
        for name in applied:
            if name in EXPECTED: shutil.copy2(backup/name,root/name)
            else: (root/name).unlink(missing_ok=True)
        raise
    print(f'Applied. Originals backed up in {backup.name}')
    print('Next: npm run build; test with a staging database before deploying.')
if __name__ == '__main__': main()
