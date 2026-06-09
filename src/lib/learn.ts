export interface LearnDoc {
  slug: string;
  title: string;
}

// Ordered roughly by solving-technique difficulty, following the HoDoKu guide structure.
export const LEARN_DOCS: LearnDoc[] = [
  {slug: "tech_intro", title: "Introduction"},
  {slug: "tech_singles", title: "Singles"},
  {slug: "tech_intersections", title: "Intersections"},
  {slug: "tech_hidden", title: "Hidden Subsets"},
  {slug: "tech_naked", title: "Naked Subsets"},
  {slug: "tech_fishg", title: "Fish (General Explanation)"},
  {slug: "tech_fishb", title: "Basic Fish"},
  {slug: "tech_fishfs", title: "Finned/Sashimi Fish"},
  {slug: "tech_fishc", title: "Complex Fish"},
  {slug: "tech_sdp", title: "Single Digit Patterns"},
  {slug: "tech_wings", title: "Wings"},
  {slug: "tech_col", title: "Coloring"},
  {slug: "tech_chains", title: "Chains and Loops"},
  {slug: "tech_als", title: "ALS (Almost Locked Sets)"},
  {slug: "tech_ur", title: "Uniqueness"},
  {slug: "tech_last", title: "Last Resort"},
  {slug: "tech_misc", title: "Miscellaneous"},
];

const SLUGS = new Set(LEARN_DOCS.map((d) => d.slug));

export const isLearnSlug = (slug: string): boolean => SLUGS.has(slug);

export const learnDocUrl = (slug: string): string => `${import.meta.env.BASE_URL}learn/${slug}.md`;

export const learnAssetBase = (): string => `${import.meta.env.BASE_URL}learn/`;
