import { Link } from "react-router-dom";
import IconBadge from "../components/IconBadge";
import { SearchIcon } from "../components/Icons";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <IconBadge size="lg">
        <SearchIcon strokeWidth={1.5} />
      </IconBadge>
      <h1 className="mt-4 font-display text-4xl font-medium">We couldn't find that page</h1>
      <p className="mt-2 text-ink-soft">It may have moved, or the link might be mistyped.</p>
      <Link to="/" className="btn-primary mt-8">
        Back to the shop
      </Link>
    </div>
  );
}
