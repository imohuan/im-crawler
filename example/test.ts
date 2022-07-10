import { DataParser } from "../src/typings";

const getItemChildren = (option: DataParser[]): any => {
  return option.reduce((pre, cur) => {
    const { name, children, ...option } = cur;
    if (!name) return pre;
    const result: any = { option };
    if (children && children.length > 0) {
      result.next = getItemChildren(children);
    }
    pre[name] = result;
    return pre;
  }, {});
};

const result1 = getItemChildren([
  {
    name: "list-1",
    parent: "",
    children: [
      {
        name: "list-2",
        parent: "",
        children: [
          {
            name: "list-3",
            parent: "",
            children: [
              { name: "sdf1", parent: "", children: [] },
              { name: "21312", parent: "", children: [] }
            ]
          }
        ]
      }
    ]
  }
]);
const targetObj = "list-1.list-2.list-3".split(".").reduce((pre, key) => pre[key]?.next, result1);
