import Link from "next/link";
import { motion } from "framer-motion";
import { ChefHat } from "lucide-react";
import type { Recipe } from "@/lib/api";
import { cn } from "@/lib/cn";

export function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const cover = recipe.photos[0]?.url;
  const cats = recipe.categories.slice(0, 2);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.3, ease: "easeOut" }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Link
        href={`/recipes/${recipe.id}`}
        className="group block h-full overflow-hidden rounded-3xl border border-line bg-card shadow-warm-sm transition-shadow hover:shadow-warm"
      >
        <div className="relative h-44 w-full overflow-hidden bg-card-soft">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={recipe.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-spice/20 via-tomato/10 to-leaf/15">
              <ChefHat className="size-12 text-caramel/70 dark:text-spice/60" />
            </div>
          )}
          {cats.length > 0 && (
            <div className="absolute left-3 top-3 flex gap-1.5">
              {cats.map((c) => (
                <span key={c.id} className={cn("chip", `cat-${c.id % 6}`, "bg-card/90 backdrop-blur")}>
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 p-4">
          <h2 className="font-display text-lg font-bold leading-snug">{recipe.title}</h2>
        </div>
      </Link>
    </motion.div>
  );
}
