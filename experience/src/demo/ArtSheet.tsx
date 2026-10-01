import { ProductArt } from '../ui/ProductArt';
import type { ArtKey } from '../sim/types';

const ALL: ArtKey[] = ['phone', 'tv', 'ac', 'fridge', 'washer', 'scooter', 'rice', 'laptop', 'solar', 'mixer', 'oil', 'mutton', 'cement', 'books', 'cleaning', 'fan', 'purifier', 'geyser', 'chimney', 'waterpurifier'];

/** Design QA: every product render at card and thumbnail size (not linked from the app). */
export function ArtSheet() {
  return (
    <div className="min-h-full bg-bg p-6">
      <div className="grid grid-cols-5 gap-4">
        {ALL.map((a) => (
          <div key={a} className="flex flex-col items-center gap-2">
            <ProductArt art={a} size={180} rounded={28} />
            <div className="flex items-center gap-2">
              <ProductArt art={a} size={56} />
              <ProductArt art={a} size={40} rounded={12} />
              <span className="text-[12px] font-semibold text-ink-3">{a}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
