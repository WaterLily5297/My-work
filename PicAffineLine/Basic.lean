/-
Copyright (c) 2026. All rights reserved.
Released under Apache 2.0 license.
-/
import Mathlib.AlgebraicGeometry.Modules.Tilde
import Mathlib.Algebra.Category.ModuleCat.Sheaf.LocallyFree
import Mathlib.Algebra.Polynomial.FieldDivision
import PicAffineLine.Algebra

/-!
# `Pic (𝔸¹_k) = 0`

Let `k` be a field and `𝔸¹_k = Spec k[t]`. We show that every invertible sheaf on `𝔸¹_k` is
isomorphic to the structure sheaf. More generally this holds on `Spec A` for every principal
ideal domain `A`.

## Main definitions

* `AlgebraicGeometry.Scheme.Modules.IsInvertible L`: an `𝒪_X`-module `L` is *invertible*
  (a line bundle) if every point has an open neighbourhood `U` with `L|_U ≅ 𝒪_X|_U`.
* `AlgebraicGeometry.Scheme.PicSet X`: the isomorphism classes of invertible sheaves on `X`.

## Main results

* `Scheme.Modules.IsInvertible.isQuasicoherent`: invertible sheaves are quasi-coherent.
* `PicAffineLine.iso_unit_of_isInvertible`: on `Spec A`, `A` a PID, every invertible sheaf is
  isomorphic to `𝒪`.
* `PicAffineLine.pic_affineLine_eq_zero`: `Pic (𝔸¹_k) = 0`, i.e. `PicSet (Spec k[t])` has
  exactly one element.

## Proof outline

1. An invertible sheaf `L` is quasi-coherent (being so is local, and `𝒪` is quasi-coherent).
2. On an affine scheme, quasi-coherent sheaves are of the form `M~` with `M = Γ(L)`.
3. Choose functions `g` with `D(g)` covering `Spec A` on which `L` is trivial. Then
   `M_g ≅ Γ(L, D(g)) ≅ Γ(𝒪, D(g)) = A_g`.
4. By `PicAffineLine.nonempty_linearEquiv_of_locallyTrivial`, `M ≅ A`, so `L ≅ A~ = 𝒪`.

## Implementation notes

Mathlib does not (yet) have the tensor product of `𝒪_X`-modules, so `Pic X` is not defined as a
group there. We define the underlying pointed set `PicSet X` of isomorphism classes of invertible
sheaves (pointed by `𝒪_X`), and `Pic (𝔸¹_k) = 0` is formalized as `Unique (PicSet 𝔸¹_k)`.
-/

universe u

open CategoryTheory Limits Opposite TopologicalSpace

namespace AlgebraicGeometry

namespace Scheme.Modules

variable {X : Scheme.{u}}

/-- An `𝒪_X`-module `L` is *invertible* (a line bundle) if every point `x : X` has an open
neighbourhood `U` such that the restriction of `L` to `U` is isomorphic to the restriction
of `𝒪_X` to `U`. -/
def IsInvertible (L : X.Modules) : Prop :=
  ∀ x : X, ∃ U : X.Opens, x ∈ U ∧
    Nonempty (SheafOfModules.over L U ≅ SheafOfModules.over (SheafOfModules.unit X.ringCatSheaf) U)

/-- The structure sheaf is invertible. -/
lemma isInvertible_unit : IsInvertible (SheafOfModules.unit X.ringCatSheaf : X.Modules) :=
  fun _ ↦ ⟨⊤, trivial, ⟨Iso.refl _⟩⟩

/-- Being invertible is invariant under isomorphism. -/
lemma IsInvertible.of_iso {L L' : X.Modules} (e : L ≅ L') (hL : L.IsInvertible) :
    L'.IsInvertible := by
  intro x
  obtain ⟨U, hxU, ⟨e'⟩⟩ := hL x
  exact ⟨U, hxU, ⟨(SheafOfModules.overFunctor _ U).mapIso e.symm ≪≫ e'⟩⟩

/-- The unit sheaf of modules over `𝒪_X|_U` is quasi-coherent. -/
lemma isQuasicoherent_unit_over (U : X.Opens) :
    (SheafOfModules.over (SheafOfModules.unit X.ringCatSheaf) U).IsQuasicoherent := by
  have : (SheafOfModules.free (R := X.ringCatSheaf.over U) PUnit.{u + 1}).IsQuasicoherent :=
    inferInstance
  exact (SheafOfModules.isQuasicoherent (X.ringCatSheaf.over U)).prop_of_iso
    (coproductUniqueIso (fun _ : PUnit.{u + 1} ↦ SheafOfModules.unit (X.ringCatSheaf.over U)))
    this

/-- Invertible sheaves are quasi-coherent. -/
theorem IsInvertible.isQuasicoherent {L : X.Modules} (hL : L.IsInvertible) :
    L.IsQuasicoherent := by
  choose U hxU e using hL
  have hU : (Opens.grothendieckTopology X).CoversTop U := by
    rw [Opens.coversTop_iff]
    refine IsOpenCover.mk (eq_top_iff.mpr fun x _ ↦ ?_)
    exact Opens.mem_iSup.mpr ⟨x, hxU x⟩
  have (x : X) : (SheafOfModules.over L (U x)).IsQuasicoherent :=
    (SheafOfModules.isQuasicoherent (X.ringCatSheaf.over (U x))).prop_of_iso (e x).some.symm
      (isQuasicoherent_unit_over _)
  exact SheafOfModules.IsQuasicoherent.of_coversTop L U hU

end Scheme.Modules

/-- The (pointed) set of isomorphism classes of invertible sheaves on `X`: the underlying set
of the Picard group `Pic X`. -/
def Scheme.PicSet (X : Scheme.{u}) : Type (u + 1) :=
  Quot fun (L L' : {L : X.Modules // L.IsInvertible}) ↦ Nonempty (L.1 ≅ L'.1)

/-- The base point of `PicSet X`: the class of `𝒪_X`. -/
noncomputable def Scheme.PicSet.one (X : Scheme.{u}) : X.PicSet :=
  Quot.mk _ ⟨SheafOfModules.unit X.ringCatSheaf, Scheme.Modules.isInvertible_unit⟩

end AlgebraicGeometry

namespace PicAffineLine

open AlgebraicGeometry

variable {R : CommRingCat.{u}}

/-- The basic open `D(g)` of `Spec R`, as an open of the scheme `Spec R`. (A separate definition
helps instance search find the module structures on sections over it.) -/
noncomputable def D (g : R) : (Spec R).Opens := PrimeSpectrum.basicOpen g

instance (g : R) : IsLocalization.Away g Γ(Spec R, D g) :=
  inferInstanceAs (IsLocalization.Away g
    ((Spec.structureSheaf R).obj.obj (op <| PrimeSpectrum.basicOpen g)))

/-- On `Spec R`, an isomorphism between `L` and `𝒪` restricted to `U` gives, for every basic open
`D(g) ⊆ U`, a `Γ(Spec R, D(g))`-linear isomorphism `Γ(L, D(g)) ≃ Γ(Spec R, D(g))`. -/
noncomputable def sectionsEquiv {L : (Spec R).Modules} {U : (Spec R).Opens} {g : R}
    (hgU : D g ≤ U)
    (E : SheafOfModules.over L U ≅
      SheafOfModules.over (SheafOfModules.unit (Spec R).ringCatSheaf) U) :
    Γ(L, D g) ≃ₗ[Γ(Spec R, D g)] Γ(Spec R, D g) :=
  ((SheafOfModules.evaluation _ (op (Over.mk (homOfLE hgU)))).mapIso E).toLinearEquiv

/-- **Line bundles on the spectrum of a PID are trivial.** -/
theorem iso_unit_of_isInvertible [IsDomain R] [IsPrincipalIdealRing R]
    (L : (Spec R).Modules) (hL : L.IsInvertible) :
    Nonempty (L ≅ SheafOfModules.unit (Spec R).ringCatSheaf) := by
  have := hL.isQuasicoherent
  -- `L` is localizing: `Γ(L, D(g))` is the localization of `Γ(L) := Γ(L, ⊤)` at `g`.
  have hloc : IsLocalizing (modulesSpecToSheaf.obj L) :=
    (isIso_fromTildeΓ_iff_isLocalizing L).mp inferInstance
  -- The set of `g` such that `L` is trivial on some open containing `D(g)`.
  let s : Set R := {g | ∃ U : (Spec R).Opens, D g ≤ U ∧ Nonempty (SheafOfModules.over L U ≅
      SheafOfModules.over (SheafOfModules.unit (Spec R).ringCatSheaf) U)}
  have hs : Ideal.span s = ⊤ := by
    rw [← PrimeSpectrum.iSup_basicOpen_eq_top_iff', eq_top_iff]
    intro x _
    obtain ⟨U, hxU, ⟨e⟩⟩ := hL x
    obtain ⟨_, ⟨_, ⟨g, rfl⟩, rfl⟩, hxg, hgU⟩ :=
      PrimeSpectrum.isBasis_basic_opens.exists_subset_of_mem_open hxU U.2
    simp only [Opens.mem_iSup]
    exact ⟨g, ⟨U, hgU, ⟨e⟩⟩, hxg⟩
  -- The module of global sections.
  let M := (modulesSpecToSheaf.obj L).presheaf.obj (op ⊤)
  have key : Nonempty (M ≃ₗ[R] R) := by
    let φ : ∀ g : s, M →ₗ[R] Γ(L, D g.1) := fun g ↦
      ((modulesSpecToSheaf.obj L).obj.map (D g.1).leTop.op).hom
    have : ∀ g : s, IsLocalizedModule.Away g.1 (φ g) := fun g ↦ hloc g.1
    exact PicAffineLine.nonempty_linearEquiv_of_locallyTrivial s hs
      (fun g ↦ Γ(Spec R, D g.1)) (fun g ↦ Γ(L, D g.1)) φ
      (fun g ↦ sectionsEquiv g.2.choose_spec.1 g.2.choose_spec.2.some)
  obtain ⟨f⟩ := key
  exact ⟨(asIso L.fromTildeΓ).symm ≪≫ (tilde.functor _).mapIso f.toModuleIso ≪≫ tildeSelf⟩

/-- On `Spec R`, `R` a PID, the Picard set has exactly one element. -/
noncomputable instance [IsDomain R] [IsPrincipalIdealRing R] :
    Unique (Spec (R)).PicSet where
  default := Scheme.PicSet.one _
  uniq x := by
    induction x using Quot.ind with
    | mk L =>
      obtain ⟨e⟩ := iso_unit_of_isInvertible L.1 L.2
      exact Quot.sound ⟨e⟩

variable (k : Type u) [Field k]

/-- **`Pic (𝔸¹_k) = 0`**: every invertible sheaf on `𝔸¹_k = Spec k[t]` is isomorphic to the
structure sheaf. -/
theorem iso_unit_of_isInvertible_affineLine
    (L : (Spec (CommRingCat.of (Polynomial k))).Modules) (hL : L.IsInvertible) :
    Nonempty (L ≅ SheafOfModules.unit (Spec (CommRingCat.of (Polynomial k))).ringCatSheaf) :=
  iso_unit_of_isInvertible L hL

/-- **`Pic (𝔸¹_k) = 0`**, stated as: the set of isomorphism classes of invertible sheaves on
`𝔸¹_k = Spec k[t]` has exactly one element. -/
theorem pic_affineLine_eq_zero : Nonempty (Unique (Spec (CommRingCat.of (Polynomial k))).PicSet) :=
  ⟨inferInstance⟩

end PicAffineLine
