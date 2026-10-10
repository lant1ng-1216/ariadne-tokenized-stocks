import { BrandMark } from "./brand-mark";

export function Navigation() {
  return <header className="nav-shell">
    <a className="brand" href="#top" aria-label="Ariadne home"><BrandMark size={38} /><span>Ariadne</span></a>
    <nav aria-label="Primary navigation">
      <a href="#product">Product</a><a href="#developers">Developers</a>
      <a href="https://github.com/lant1ng-1216/ariadne-tokenized-stocks" target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  </header>;
}
