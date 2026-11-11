export const STEM_ADAPTERS_BY_SLUG: Record<string, readonly string[]> = {
  "quadratic-graph-explorer": ["canvas_quadratic"],
  "projectile-motion-simulator": ["canvas_kinematics"],
  "ohms-law-dc-circuit": ["circuit_dc"],
  "acid-base-titration-curve": ["chem_titration"],
  "cell-ultrastructure-guide": ["vector_cell"],
  "genetics-punnett-square-lab": ["canvas_genetics"],
  "logic-gates-circuits": ["canvas_logic"],
  "molecular-3d-explorer": ["molecular_3d"],
  "molecular-explorer": ["molecular_3d"],
};

export function isSupportedStemAdapter(slug: string, adapterType: string): boolean {
  return (STEM_ADAPTERS_BY_SLUG[slug] || []).includes(adapterType);
}
