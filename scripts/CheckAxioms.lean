import PicAffineLine

/-!
Prints the axioms behind the main theorems. CI runs

    lake env lean scripts/CheckAxioms.lean > axioms.txt
    python3 scripts/check_axioms.py axioms.txt scripts/CheckAxioms.lean

which fails if any of them uses `sorryAx` or an axiom beyond
`propext`, `Classical.choice` and `Quot.sound`.
-/

#print axioms PicAffineLine.pic_affineLine_eq_zero
#print axioms PicAffineLine.iso_unit_of_isInvertible_affineLine
#print axioms PicAffineLine.iso_unit_of_isInvertible
#print axioms PicAffineLine.nonempty_linearEquiv_of_locallyTrivial
#print axioms AlgebraicGeometry.Scheme.Modules.IsInvertible.isQuasicoherent
