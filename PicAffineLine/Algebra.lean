/-
Copyright (c) 2026. All rights reserved.
Released under Apache 2.0 license.
-/
import Mathlib.RingTheory.Localization.Finiteness
import Mathlib.RingTheory.LocalProperties.Projective
import Mathlib.LinearAlgebra.FreeModule.PID
import Mathlib.LinearAlgebra.Dimension.Free
import Mathlib.Algebra.Module.LocalizedModule.Away

/-!
# Locally trivial modules over a PID are trivial

Let `R` be a principal ideal domain and `M` an `R`-module. Suppose `s ⊆ R` generates the unit
ideal and that for every `g ∈ s` the localization `M_g` is isomorphic to `R_g` (as an
`R_g`-module). Then `M ≅ R`.

This is the commutative-algebra heart of `Pic (𝔸¹_k) = 0`:
* `M` is finitely generated (finiteness is local),
* `M` is torsion-free (each `M_g ≅ R_g` is torsion-free and `s` generates `R`),
* hence `M` is free (structure theorem over a PID),
* and its rank is `1`, computed after localizing at some nonzero `g ∈ s`.
-/

open Module

universe u v w

namespace PicAffineLine

variable {R : Type u} [CommRing R] [IsDomain R]

/-- In a localization `A = R[1/g]` of a domain, multiplication by the image of a nonzero element
is injective. (If `g = 0` then `A = 0` and the statement is trivial.) -/
lemma eq_zero_of_algebraMap_mul_eq_zero {g r : R} (hr : r ≠ 0) (A : Type w) [CommRing A]
    [Algebra R A] [IsLocalization.Away g A] {a : A} (h : algebraMap R A r * a = 0) : a = 0 := by
  by_cases hg : g = 0
  · have : Subsingleton A :=
      IsLocalization.subsingleton (M := Submonoid.powers g) ⟨1, by simp [hg]⟩
    exact Subsingleton.elim _ _
  · have hle : Submonoid.powers g ≤ nonZeroDivisors R := powers_le_nonZeroDivisors_of_noZeroDivisors hg
    have : IsDomain A := IsLocalization.isDomain_of_le_nonZeroDivisors (S := A) hle
    have hinj : Function.Injective (algebraMap R A) := IsLocalization.injective A hle
    have hr' : algebraMap R A r ≠ 0 := fun h0 ↦ hr (hinj (by simpa using h0))
    exact (mul_eq_zero.mp h).resolve_left hr'

variable [IsPrincipalIdealRing R] {M : Type v} [AddCommGroup M] [Module R M]

/-- **Locally trivial modules over a PID are trivial.**

If `s` generates the unit ideal of the PID `R` and for every `g ∈ s` we are given a localization
`φ g : M → Mₚ g` of `M` away from `g` together with an `Rₚ g`-linear isomorphism
`Mₚ g ≃ Rₚ g`, where `Rₚ g` is a localization of `R` away from `g`, then `M ≅ R`. -/
theorem nonempty_linearEquiv_of_locallyTrivial
    (s : Set R) (hs : Ideal.span s = ⊤)
    (Rₚ : s → Type w) [∀ g, CommRing (Rₚ g)] [∀ g, Algebra R (Rₚ g)]
    [∀ g : s, IsLocalization.Away g.1 (Rₚ g)]
    (Mₚ : s → Type w) [∀ g, AddCommGroup (Mₚ g)] [∀ g, Module R (Mₚ g)]
    [∀ g, Module (Rₚ g) (Mₚ g)] [∀ g, IsScalarTower R (Rₚ g) (Mₚ g)]
    (φ : ∀ g, M →ₗ[R] Mₚ g) [∀ g : s, IsLocalizedModule.Away g.1 (φ g)]
    (e : ∀ g, Mₚ g ≃ₗ[Rₚ g] Rₚ g) :
    Nonempty (M ≃ₗ[R] R) := by
  -- Step 1: `M` is finitely generated, since this can be checked locally.
  have hfin : Module.Finite R M :=
    Module.Finite.of_localizationSpan' s hs φ fun g ↦ Module.Finite.equiv (e g).symm
  -- Step 2: `M` is torsion-free.
  have htf : Module.IsTorsionFree R M := by
    rw [Module.isTorsionFree_iff_smul_eq_zero]
    intro r m hrm
    by_cases hr : r = 0
    · exact Or.inl hr
    right
    have hmem : m ∈ (⊥ : Submodule R M) := by
      refine Submodule.mem_of_span_eq_top_of_smul_pow_mem ⊥ s hs m fun g ↦ ?_
      -- the image of `m` in `M_g ≅ R_g` is killed by `r ≠ 0`, hence is zero
      have h1 : algebraMap R (Rₚ g) r * e g (φ g m) = 0 := by
        rw [← smul_eq_mul, ← LinearEquiv.map_smul, algebraMap_smul, ← LinearMap.map_smul, hrm,
          map_zero, map_zero]
      have h2 : φ g m = 0 := by
        have := eq_zero_of_algebraMap_mul_eq_zero (g := g.1) hr (Rₚ g) h1
        simpa using this
      obtain ⟨n, hn⟩ :=
        IsLocalizedModule.Away.exists_of_eq (r := g.1) (f := φ g) (x := m) (y := 0)
          (by rw [h2, map_zero])
      exact ⟨n, by simpa using hn⟩
    simpa using hmem
  -- Step 3: hence `M` is free (structure theorem over a PID).
  have hfree : Module.Free R M := Module.free_of_finite_type_torsion_free'
  -- Step 4: the rank is one; compute it after localizing at some nonzero `g ∈ s`.
  obtain ⟨g, hg⟩ : ∃ g : s, g.1 ≠ 0 := by
    by_contra! h
    have hle : Ideal.span s ≤ ⊥ :=
      Ideal.span_le.mpr fun x hx ↦ by simpa using h ⟨x, hx⟩
    rw [hs, top_le_iff] at hle
    exact top_ne_bot hle.symm
  have hle : Submonoid.powers g.1 ≤ nonZeroDivisors R :=
    powers_le_nonZeroDivisors_of_noZeroDivisors hg
  have : Nontrivial (Rₚ g) := (IsLocalization.injective (Rₚ g) hle).nontrivial
  have hrank : finrank R M = 1 := by
    rw [← Module.finrank_of_isLocalizedModule_of_free (Rₚ g) (Submonoid.powers g.1) (φ g),
      (e g).finrank_eq, Module.finrank_self]
  let b : Basis (Fin 1) R M := Module.finBasisOfFinrankEq R M hrank
  exact ⟨b.equivFun.trans (LinearEquiv.funUnique (Fin 1) R R)⟩

end PicAffineLine
