import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

interface ToolRoot {
  cat: string,
  title: string,
  desc: string
}

const roots: ToolRoot[] = [
  {
    cat: "crypto",
    title: "caesar",
    desc: "Caesar Cipher Encryption and Decryption",
  },
  {
    cat: "crypto",
    title: "vigenere",
    desc: "Vigenere Cipher Encryption and Decryption",
  },
  {
    cat: "crypto",
    title: "rail-fence",
    desc: "Rail-Fence Cipher Encryption and Decryption",
  },
  {
    cat: "crypto",
    title: "substitution",
    desc: "Helping to decipher substitutions",
  },
  {
    cat: "crypto",
    title: "morse",
    desc: "Morse Code Encryption and Decryption",
  },
  {
    cat: "school",
    title: "dakoku",
    desc: "Lecture attendance management",
  },
]

export const meta: MetaFunction = () => {
  return [
    { title: "tools" },
    { name: "description", content: "tksnn's tools" },
  ];
};

export default function Index() {
  const rootmap = roots.reduce((m, r) => {
    (m[r.cat] = m[r.cat] || []).push(r);
    return m;
  }, {} as Record<string, ToolRoot[]>);
  return (
    <div>
      <h1 className="text-2xl font-bold">Tools</h1>
      {Object.keys(rootmap).map((cat) => (
        <div key={cat} className="px-2 py-1">
          <div className="text-xl font-semibold text-indigo-950">
            /{cat}
          </div>
          <div className="flex flex-col">
            {rootmap[cat].map((r) => (
              <div key={r.title} className="flex gap-x-1 px-4 items-baseline">
                <Link to={`/${cat}/${r.title}`} className="text-lg font-bold text-indigo-950 whitespace-nowrap">
                  /{r.title}
                </Link>
                <span className="text-gray-500 text-sm">:</span>
                <span className="text-gray-600 text-sm">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
