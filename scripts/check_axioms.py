"""Check `#print axioms` output: every listed theorem uses only the standard axioms.

Usage: python3 scripts/check_axioms.py axioms.txt scripts/CheckAxioms.lean
"""
import re
import sys

STANDARD = {'propext', 'Classical.choice', 'Quot.sound'}


def check(output, source):
    expected = re.findall(r'^#print axioms (\S+)', source, re.M)
    found = {}
    # Lean may wrap a long axiom list over several lines, so match across newlines.
    for name, axioms in re.findall(r"'([^']+)' depends on axioms:\s*\[([^\]]*)\]", output):
        found[name] = {axiom.strip() for axiom in axioms.split(',') if axiom.strip()}
    for name in re.findall(r"'([^']+)' does not depend on any axioms", output):
        found[name] = set()
    problems = [f'{name}: no #print axioms output' for name in expected if name not in found]
    problems += [f'{name}: uses {", ".join(sorted(axioms - STANDARD))}'
                 for name, axioms in found.items() if axioms - STANDARD]
    return expected, found, problems


def main(output_path, source_path):
    with open(output_path, encoding='utf-8') as f:
        output = f.read()
    with open(source_path, encoding='utf-8') as f:
        source = f.read()
    expected, found, problems = check(output, source)
    for name in expected:
        if name in found:
            print(f'{name}: {", ".join(sorted(found[name])) or "no axioms"}')
    if problems or not expected:
        print('\n'.join(problems or ['no theorems listed']), file=sys.stderr)
        return 1
    print(f'All {len(expected)} theorems use only {", ".join(sorted(STANDARD))}.')
    return 0


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:3]))
