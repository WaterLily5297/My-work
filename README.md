# Pic(𝔸¹_k) = 0 in Lean 4

A formalization in Lean 4 + Mathlib of the following exercise:

> Let `k` be a field and `X = 𝔸¹_k = Spec k[t]`. Every invertible sheaf `𝓛` on `X` is
> isomorphic to `𝒪_X`, i.e. `Pic(𝔸¹_k) = 0`.

It is proved more generally for `Spec A`, where `A` is any principal ideal domain. Everything
compiles with no `sorry`, and the main theorems depend only on the standard axioms
(`propext`, `Classical.choice`, `Quot.sound`).

## Main statements

| Lean name | Statement |
|---|---|
| `AlgebraicGeometry.Scheme.Modules.IsInvertible L` | **Definition.** An `𝒪_X`-module `L` is invertible: every point has an open neighbourhood `U` with `L∣_U ≅ 𝒪_X∣_U`. |
| `Scheme.Modules.IsInvertible.isQuasicoherent` | Invertible sheaves are quasi-coherent. |
| `AlgebraicGeometry.Scheme.PicSet X` | **Definition.** The set of isomorphism classes of invertible sheaves on `X`, with `𝒪_X` as base point. |
| `PicAffineLine.nonempty_linearEquiv_of_locallyTrivial` | Over a PID `R`, a module `M` with `M_g ≅ R_g` for all `g` in a set generating `(1)` is isomorphic to `R`. |
| `PicAffineLine.iso_unit_of_isInvertible` | On `Spec A` (`A` a PID), every invertible sheaf is `≅ 𝒪`. |
| `PicAffineLine.iso_unit_of_isInvertible_affineLine` | The same for `𝔸¹_k = Spec k[t]`. |
| `PicAffineLine.pic_affineLine_eq_zero` | **`Pic(𝔸¹_k) = 0`**: `PicSet (Spec k[t])` has exactly one element. |

## Proof outline

1. **Invertible ⇒ quasi-coherent.** Quasi-coherence is local
   (`SheafOfModules.IsQuasicoherent.of_coversTop`), and `𝒪∣_U` is quasi-coherent.
2. **Quasi-coherent ⇒ `𝓛 ≅ M~`** with `M = Γ(X, 𝓛)` (Mathlib's `Scheme.Modules.fromTildeΓ`).
   In particular, `Γ(𝓛, D(g)) = M_g`.
3. Pick `g`'s such that the `D(g)` cover `Spec A` and `𝓛` is trivial on each `D(g)`. Then the
   `g`'s generate the unit ideal, and `M_g ≅ Γ(𝓛, D(g)) ≅ Γ(𝒪, D(g)) = A_g`.
4. **Commutative algebra** (`PicAffineLine/Algebra.lean`):
   * `M` is finitely generated, because finiteness is local;
   * `M` is torsion-free, because each `M_g ≅ A_g` is;
   * so `M` is free, by the structure theorem over a PID;
   * localizing at a nonzero `g` shows `rank M = rank A_g = 1`, so `M ≅ A`.
5. Hence `𝓛 ≅ M~ ≅ A~ = 𝒪`.

## Implementation notes

* Mathlib does not yet have the tensor product of `𝒪_X`-modules, so the Picard *group* of a
  scheme can't be defined there. `Pic(𝔸¹_k) = 0` is therefore stated for the underlying pointed
  set `PicSet` of isomorphism classes. Since this set has only one element, no group structure is
  needed to conclude.
* `𝔸¹_k` is taken to be `Spec k[t]`, i.e. `Spec (CommRingCat.of (Polynomial k))`.
* "Locally isomorphic to `𝒪_X`" uses Mathlib's restriction `SheafOfModules.over L U` to the
  slice site over `U`.

## Building

```
lake build
```

Uses Lean `v4.35.0` and Mathlib `v4.35.0`. Running `lake exe cache get` first downloads the
prebuilt Mathlib, which saves several hours of compiling.

## 日本語の概要

体 `k` 上のアフィン直線 `𝔸¹_k = Spec k[t]` について、任意の可逆層が構造層と同型であること
（`Pic(𝔸¹_k) = 0`）を Lean 4 で形式化しました。より一般に、単項イデアル整域 `A` に対して
`Spec A` 上で証明しています。方針は「可逆層 ⇒ 準連接 ⇒ `𝓛 ≅ M~` ⇒ `M` は有限生成かつ
ねじれなし ⇒ PID 上なので自由 ⇒ 局所化で階数 1 ⇒ `M ≅ A`」です。
