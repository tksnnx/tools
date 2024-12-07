import elkLayouts from "@mermaid-js/layout-elk";
import type { MetaFunction } from "@remix-run/cloudflare";
import mermaid from "mermaid";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "/automata/nfa2dfa" },
    { name: "description", content: "Convert the NFA to the DFA" },
  ];
};

interface Transition {
  id: number;
  node: string;
  initial: boolean;
  final: boolean;
  outputs: { [key: string]: number[] };
}

interface FocusConfig {
  open: boolean;
  index: number;
  key: string;
  top: number;
  left: number;
}

export default function NFA2DFA() {
  const [editorMode, setEditorMode] = useState<"table" | "text">("table");
  const [textEditorString, setTextEditorString] = useState("");
  const previewNFARef = useRef<HTMLPreElement>(null);
  const previewDFARef = useRef<HTMLPreElement>(null);
  const [outputKeys, setOutputKeys] = useState<string[]>(["ε", "a", "b"]);
  const [focusConfig, setFocusConfig] = useState<FocusConfig>({
    open: false,
    index: 0,
    key: "",
    top: 0,
    left: 0,
  });
  const [transitions, setTransitions] = useState<Transition[]>([
    {
      id: 0,
      node: "",
      initial: true,
      final: false,
      outputs: outputKeys.reduce(
        (acc, key) => {
          acc[key] = [];
          return acc;
        },
        {} as { [key: string]: number[] }
      ),
    },
  ]);
  const lastTransitionId = useMemo(() => {
    return transitions[transitions.length - 1].id;
  }, [transitions]);
  const onTranNodeChange = (
    ev: ChangeEvent<HTMLInputElement>,
    target: number
  ) => {
    setTransitions(
      transitions.map((tran, idx) =>
        idx === target
          ? {
              ...tran,
              node: ev.target.value,
            }
          : tran
      )
    );
  };
  const onTranInitialChange = (
    ev: ChangeEvent<HTMLInputElement>,
    target: number
  ) => {
    setTransitions(
      transitions.map((tran, idx) =>
        idx === target
          ? {
              ...tran,
              initial: ev.target.checked,
            }
          : tran
      )
    );
  };
  const onTranFinalChange = (
    ev: ChangeEvent<HTMLInputElement>,
    target: number
  ) => {
    setTransitions(
      transitions.map((tran, idx) =>
        idx === target
          ? {
              ...tran,
              final: ev.target.checked,
            }
          : tran
      )
    );
  };
  const onOutputFocusChange = (
    val: boolean,
    index: number = 0,
    key: string = "",
    el: HTMLInputElement | null = null
  ) => {
    if (el) {
      const rect = el.getBoundingClientRect();
      setFocusConfig({
        open: val,
        index,
        key,
        top: rect.top + rect.height,
        left: rect.left,
      });
    } else {
      setFocusConfig({
        ...focusConfig,
        open: val,
        index,
        key,
      });
    }
  };
  const onOutputChange = (id: number) => {
    setTransitions(
      transitions.map((tran, idx) => {
        if (focusConfig.index === idx) {
          if ((tran.outputs[focusConfig.key] || []).includes(id)) {
            tran.outputs[focusConfig.key] = (
              tran.outputs[focusConfig.key] || []
            ).reduce((acc, nid) => {
              if (nid !== id) acc.push(nid);
              return acc;
            }, [] as number[]);
          } else {
            tran.outputs[focusConfig.key] = transitions.reduce((acc, ntran) => {
              if (
                (tran.outputs[focusConfig.key] || []).includes(ntran.id) ||
                ntran.id === id
              )
                acc.push(ntran.id);
              return acc;
            }, [] as number[]);
          }
        }
        return tran;
      })
    );
  };
  const addTransition = () => {
    setTransitions([
      ...transitions,
      {
        id: lastTransitionId + 1,
        node: "",
        initial: false,
        final: false,
        outputs: outputKeys.reduce(
          (acc, key) => {
            acc[key] = [];
            return acc;
          },
          {} as { [key: string]: number[] }
        ),
      },
    ]);
  };
  const addOutput = () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const remaining = alphabet.filter((letter) => !outputKeys.includes(letter));
    if (remaining.length > 0) {
      setOutputKeys([...outputKeys, remaining[0]]);
    }
  };
  const deleteOutput = (delkey: string) => {
    setOutputKeys(outputKeys.filter((key) => key !== delkey));
  };
  const deleteTransition = (id: number) => {
    setTransitions(
      transitions.reduce((acc, tran) => {
        tran.outputs = outputKeys.reduce(
          (acc, key) => {
            acc[key] = tran.outputs[key].filter((nid) => id !== nid);
            return acc;
          },
          {} as { [key: string]: number[] }
        );
        if (tran.id !== id) acc.push(tran);
        return acc;
      }, [] as Transition[])
    );
  };
  const dfaConvertable = useMemo(() => {
    const nodes = new Set<string>();
    const nodeIds = new Set<number>();
    const targetNodeIds = new Set<number>();
    let initialCount = 0;
    let finalCount = 0;
    for (const tran of transitions) {
      if (tran.node === "") return false;
      if (nodes.has(tran.node)) return false;
      if (nodeIds.has(tran.id)) return false;
      if (tran.initial) initialCount++;
      if (tran.final) finalCount++;
      nodes.add(tran.node);
      nodeIds.add(tran.id);
      for (const key of outputKeys) {
        for (const nid of tran.outputs[key]) {
          targetNodeIds.add(nid);
        }
      }
    }
    if (initialCount !== 1) return false;
    if (finalCount <= 0) return false;
    if (targetNodeIds.difference(nodeIds).size > 0) return false;
    return true;
  }, [transitions, outputKeys]);
  const applyTableEditor = useCallback(() => {
    let res = "|id|node|q0|F|" + outputKeys.join("|") + "|\n";
    res += "|---".repeat(4 + outputKeys.length) + "|\n";
    for (const tran of transitions) {
      res += `|${tran.id}|${tran.node}|${tran.initial}|${tran.final}|`;
      res +=
        outputKeys.map((key) => tran.outputs[key].join(",")).join("|") + "|\n";
    }
    setTextEditorString(res);
  }, [transitions, outputKeys]);
  const textEditorApplicable = useMemo(() => {
    const rows = textEditorString.trim().split("\n");
    if (rows.length <= 2) return false;
    const headerColumns = rows[0]
      .split("|")
      .map((col) => col.trim())
      .filter((col) => col);
    if (headerColumns.length !== 4 + outputKeys.length) return false;
    const ids = new Set<number>();
    for (let i = 2; i < rows.length; i++) {
      const columns = rows[i]
        .split("|")
        .map((col) => col.trim())
        .slice(1, -1);
      if (columns.length !== 4 + outputKeys.length) return false;
      if (isNaN(Number(columns[0]))) return false;
      if (
        ![columns[2], columns[3]].every(
          (value) => value === "true" || value === "false"
        )
      )
        return false;
      for (let j = 4; j < columns.length; j++) {
        if (
          columns[j]
            .split(",")
            .filter((col) => col)
            .some((val) => isNaN(Number(val)))
        )
          return false;
      }
      if (ids.has(Number(columns[0]))) return false;
      ids.add(Number(columns[0]));
    }
    return true;
  }, [textEditorString, outputKeys]);
  const applyTextEditor = useCallback(() => {
    const newTransitions: Transition[] = [];
    const rows = textEditorString.trim().split("\n");
    for (let i = 2; i < rows.length; i++) {
      const columns = rows[i]
        .split("|")
        .map((col) => col.trim())
        .slice(1, -1);
      newTransitions.push({
        id: Number(columns[0]),
        node: columns[1],
        initial: columns[2].toLowerCase() === "true",
        final: columns[3].toLowerCase() === "true",
        outputs: outputKeys.reduce(
          (acc, key, idx) => {
            acc[key] = columns[4 + idx]
              .split(",")
              .filter((val) => val)
              .map((nid) => Number(nid))
              .toSorted((a, b) => a - b);
            return acc;
          },
          {} as { [key: string]: number[] }
        ),
      });
    }
    setTransitions(newTransitions);
    setEditorMode("table");
  }, [textEditorString, outputKeys]);
  useEffect(() => {
    mermaid.registerLayoutLoaders(elkLayouts);
    mermaid.initialize({
      startOnLoad: false,
      layout: "elk",
      elk: {
        nodePlacementStrategy: "NETWORK_SIMPLEX",
        cycleBreakingStrategy: "MODEL_ORDER",
      },
    });
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold">NFA to DFA</h1>
      <div className="mb-2 border-b border-gray-200">
        <ul className="flex flex-wrap text-center">
          <li className="me-2">
            <button
              className={
                "inline-block p-2 border-b-2 rounded-t-lg" +
                (editorMode === "table"
                  ? "text-indigo-600 hover:text-indigo-600 border-indigo-600"
                  : "text-gray-500 hover:text-gray-600 border-gray-100 hover:border-gray-300")
              }
              onClick={() => setEditorMode("table")}
            >
              Table
            </button>
          </li>
          <li className="me-2">
            <button
              className={
                "inline-block p-2 border-b-2 rounded-t-lg" +
                (editorMode === "text"
                  ? "text-indigo-600 hover:text-indigo-600 border-indigo-600"
                  : "hover:text-gray-600 hover:border-gray-300")
              }
              onClick={() => {
                applyTableEditor();
                setEditorMode("text");
              }}
            >
              Text
            </button>
          </li>
        </ul>
      </div>
      <div>
        <div className="p-2" hidden={editorMode !== "table"}>
          <div className="mb-2 overflow-x-auto">
            <table className="table-auto bg-white border border-gray-300 rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-100">
                  <th
                    className="border border-gray-300 px-4 py-2"
                    rowSpan={2}
                  ></th>
                  <th className="border border-gray-300 px-4 py-2" rowSpan={2}>
                    Node
                  </th>
                  <th className="border border-gray-300 px-4 py-2" colSpan={2}>
                    Type
                  </th>
                  <th
                    className="border border-gray-300 px-4 py-2"
                    colSpan={outputKeys.length}
                  >
                    Output
                  </th>
                  <th className="border border-gray-300 px-4 py-2" rowSpan={2}>
                    Del
                  </th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">q0</th>
                  <th className="border border-gray-300 px-4 py-2">F</th>
                  {outputKeys.map((key, idx) => (
                    <th
                      className="border border-gray-300 px-4 py-2 relative"
                      key={key}
                    >
                      {key}
                      {idx >= 3 && (
                        <button
                          className="absolute right-3 inset-y-0 font-bold text-2xl text-red-600 hover:text-red-800 transition"
                          onClick={() => deleteOutput(key)}
                        >
                          x
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transitions.map((tran, index) => (
                  <tr className="border-b hover:bg-gray-50" key={tran.id}>
                    <td className="border border-gray-300 text-center">
                      {tran.id}
                    </td>
                    <td className="border border-gray-300">
                      <input
                        className="px-4 py-2 w-32"
                        type="text"
                        value={tran.node}
                        onFocus={(ev) => ev.target.select()}
                        onChange={(ev) => onTranNodeChange(ev, index)}
                      />
                    </td>
                    <td className="border border-gray-300 text-center">
                      <input
                        type="checkbox"
                        checked={tran.initial}
                        onChange={(ev) => onTranInitialChange(ev, index)}
                      />
                    </td>
                    <td className="border border-gray-300 text-center">
                      <input
                        type="checkbox"
                        checked={tran.final}
                        onChange={(ev) => onTranFinalChange(ev, index)}
                      />
                    </td>
                    {outputKeys.map((key) => (
                      <td className="border border-gray-300" key={key}>
                        <input
                          className="px-4 py-2 w-32"
                          type="text"
                          value={(tran.outputs[key] || []).join(",")}
                          readOnly
                          onFocus={(ev) =>
                            onOutputFocusChange(true, index, key, ev.target)
                          }
                        />
                      </td>
                    ))}
                    <td className="border border-gray-300 text-center">
                      {tran.id !== 0 && (
                        <button
                          className="font-bold text-2xl text-red-600 hover:text-red-800 transition"
                          onClick={() => deleteTransition(tran.id)}
                        >
                          x
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {focusConfig.open && (
            <div>
              <div
                className="fixed top-0 left-0 w-full h-full z-10"
                onClick={() => onOutputFocusChange(false)}
              />
              <div
                className="absolute px-4 py-2 bg-white border border-gray-300 rounded shadow-md z-20 min-w-32"
                style={{ top: focusConfig.top, left: focusConfig.left }}
              >
                <ul>
                  {transitions.map((otran) => (
                    <li className="flex gap-2" key={otran.id}>
                      <input
                        type="checkbox"
                        checked={(
                          transitions[focusConfig.index].outputs[
                            focusConfig.key
                          ] || []
                        ).includes(otran.id)}
                        onChange={() => onOutputChange(otran.id)}
                      />
                      <label className="flex-1">
                        {otran.id}: {otran.node}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              onClick={addTransition}
            >
              Add Transition
            </button>
            <button
              className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              onClick={addOutput}
            >
              Add Output
            </button>
            <button
              className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
              disabled={!dfaConvertable}
            >
              Convert
            </button>
          </div>
        </div>
        <div className="p-2" hidden={editorMode !== "text"}>
          <textarea
            className="w-full min-h-40 max-h-80 px-4 py-2"
            style={{ ["fieldSizing" as never]: "content" }}
            value={textEditorString}
            onChange={(ev) => setTextEditorString(ev.target.value)}
          />
          <div>
            <button
              className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
              onClick={applyTextEditor}
              disabled={!textEditorApplicable}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
      <div className="my-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 flex flex-col items-center min-w-52">
            <span>NFA</span>
            <pre
              className="flex-1 flex flex-row items-center"
              ref={previewNFARef}
            />
          </div>
          <div className="flex-1 flex flex-col items-center min-w-52">
            <span>DFA</span>
            <pre
              className="flex-1 flex flex-row items-center"
              ref={previewDFARef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}