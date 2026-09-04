// Minimal rehype-slug replacement: adds stable ids to h2-h6 headings so
// TOC anchor links resolve. Written locally because rehype-slug could not
// be installed at the time; swap back to the published package when
// `npm install rehype-slug` becomes possible.
import visit from 'unist-util-visit';
import GithubSlugger from 'github-slugger';

/** @type {import('unified').Plugin<[], import('hast').Root>} */
export default function rehypeSlugLocal() {
  return (tree) => {
    const slugger = new GithubSlugger();
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'h1' ||
        node.tagName === 'h2' ||
        node.tagName === 'h3' ||
        node.tagName === 'h4' ||
        node.tagName === 'h5' ||
        node.tagName === 'h6'
      ) {
        // Duplicate headings get -1, -2 suffixes, matching rehype-slug.
        node.properties = node.properties || {};
        node.properties.id ??= slugger.slug(headingText(node));
      }
    });
  };
}

function headingText(node) {
  let text = '';
  visit(node, 'text', (child) => {
    text += child.value;
  });
  return text;
}
