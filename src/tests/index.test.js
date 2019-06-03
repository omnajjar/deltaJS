const {expect} = require("chai");
const deltaReducer = require("../index");

describe("Delta Object Reducer", () => {
  const [CREATE, UPDATE, DELETE] = ["CREATE", "UPDATE", "DELETE"];
  describe("Error handling & Options", () => {
    it("should throw an error when unknown operation is used", () => {
      const unknownOperation = "SOME_RANDOM_OPERATION";
      expect(() => {
        deltaReducer({val: "val"}, {op: unknownOperation, path: "/some/path", value: "some value"});
      }).to.throw(`Unknown operation, 'delta.op = ${unknownOperation}'`);
    });

    it("should throw an error when path is undefined", () => {
      expect(() => {
        deltaReducer({val: "val"}, {op: DELETE});
      }).to.throw("delta.path cannot be undefined");
    });

    it("should throw an error when path is invalid", () => {
      expect(() => {
        deltaReducer({val: "val"}, {op: DELETE, path: "/invalid#/1path"});
      }).to.throw("Invalid delta.path, path should contain valid object keys");
    });

    it("should throw a TypeError when path is unreachable", () => {
      const someRandomUnreachablePath = "/path/to/the/randomness/167";
      expect(() => {
        // a valid path could be /a , or /a/b or /a/0 ...etc
        deltaReducer({a: {b: {c: {}}}}, {op: UPDATE, path: someRandomUnreachablePath, value: "some value"});
      }).to.throw(TypeError);
    });

    it("should throw an error when invalid object (non-object includes Arrays) is passed", () => {
      const invalidInput = "I am not object";
      expect(() => {
        deltaReducer(invalidInput, {op: UPDATE, path: "/a/b", value: "some value"});
      }).to.throw(`invalid object, '${invalidInput}' is not an object`);
    });

    it("should throw an error when invalid object (empty object) is passed", () => {
      const invalidInput = {};
      expect(() => {
        deltaReducer(invalidInput, {op: UPDATE, path: "/a/b", value: "some value"});
      }).to.throw("invalid object {}, object should have at least one entry");
    });

    it("should throw an error when the path will lead to making an associative array", () => {
      const input = {a: ["val1", "val2"]};
      expect(() => {
        deltaReducer(input, {op: UPDATE, path: "/a/StringKeyAfAnArray", value: "some value"});
      }).to.throw("Invalid path, please use numeric key to target array element");
    });

    it("should Not mutate the given object by default, but rather return a new copy", () => {
      const obj = {a: "A"};
      const nextObj = deltaReducer(obj, {op: UPDATE, path: "/a", value: "AA"});
      expect(nextObj).to.not.equal(obj);
    });

    it("should mutate the given object when options.mutateObject is set to 'true'", () => {
      const obj = {a: "A"};
      const nextObj = deltaReducer(obj, {op: UPDATE, path: "/a", value: "AA"}, {mutateObject: true});
      expect(nextObj).to.equal(obj);
    });
  });
  describe("Data Manipulation", () => {
    describe("Parent: Object, Child: [Object, Array, Primitive]", () => {
      // these paths are equivalent
      const path1 = "/parent/child";
      const path2 = "/parent/0";
      const path3 = "/0/0";
      const path4 = "/0/child";
      it("[Child:Object] should CREATE a new entry in the child with given key & value", () => {
        const obj = {parent: {child: {val: "val"}}};
        const value = ["newKey", "newValue"];

        const delta1 = {op: CREATE, path: path1, value};
        const delta2 = {op: CREATE, path: path2, value};
        const delta3 = {op: CREATE, path: path3, value};
        const delta4 = {op: CREATE, path: path4, value};

        const nextObj1 = deltaReducer(obj, delta1);
        const nextObj2 = deltaReducer(obj, delta2);
        const nextObj3 = deltaReducer(obj, delta3);
        const nextObj4 = deltaReducer(obj, delta4);

        expect(nextObj1.parent.child.newKey).to.equal(value[1]);
        expect(nextObj2.parent.child.newKey).to.equal(value[1]);
        expect(nextObj3.parent.child.newKey).to.equal(value[1]);
        expect(nextObj4.parent.child.newKey).to.equal(value[1]);
      });
      it("[Child:Array] should CREATE (append) a new element in the child with given value", () => {
        const obj = {parent: {child: []}};
        const value = "newValue";

        const delta1 = {op: CREATE, path: path1, value};
        const delta2 = {op: CREATE, path: path2, value};
        const delta3 = {op: CREATE, path: path3, value};
        const delta4 = {op: CREATE, path: path4, value};

        const nextObj1 = deltaReducer(obj, delta1);
        const nextObj2 = deltaReducer(obj, delta2);
        const nextObj3 = deltaReducer(obj, delta3);
        const nextObj4 = deltaReducer(obj, delta4);

        const expectedIndex = nextObj1.parent.child.length - 1;

        expect(nextObj1.parent.child[expectedIndex]).to.equal(value);
        expect(nextObj2.parent.child[expectedIndex]).to.equal(value);
        expect(nextObj3.parent.child[expectedIndex]).to.equal(value);
        expect(nextObj4.parent.child[expectedIndex]).to.equal(value);
      });
      it("[Child:Primitive] should CREATE a new entry in the father of this child with given key & value", () => {
        const obj = {parent: {child: "val"}};
        const value = ["newKey", "newValue"];

        const delta1 = {op: CREATE, path: path1, value};
        const delta2 = {op: CREATE, path: path2, value};
        const delta3 = {op: CREATE, path: path3, value};
        const delta4 = {op: CREATE, path: path4, value};

        const nextObj1 = deltaReducer(obj, delta1);
        const nextObj2 = deltaReducer(obj, delta2);
        const nextObj3 = deltaReducer(obj, delta3);
        const nextObj4 = deltaReducer(obj, delta4);

        expect(nextObj1.parent.newKey).to.equal(value[1]);
        expect(nextObj2.parent.newKey).to.equal(value[1]);
        expect(nextObj3.parent.newKey).to.equal(value[1]);
        expect(nextObj4.parent.newKey).to.equal(value[1]);
      });
      it("[Child:*] should UPDATE the child with given value", () => {
        const obj1 = {parent: {child: {val: "val"}}};
        const obj2 = {parent: {child: ["val"]}};
        const obj3 = {parent: {child: "val"}};
        const value = "newValue";

        const delta1 = {op: UPDATE, path: path1, value};
        const delta2 = {op: UPDATE, path: path2, value};
        const delta3 = {op: UPDATE, path: path3, value};
        const delta4 = {op: UPDATE, path: path4, value};

        const nextObj11 = deltaReducer(obj1, delta1);
        const nextObj12 = deltaReducer(obj1, delta2);
        const nextObj13 = deltaReducer(obj1, delta3);
        const nextObj14 = deltaReducer(obj1, delta4);

        expect(nextObj11.parent.child).to.equal(value);
        expect(nextObj12.parent.child).to.equal(value);
        expect(nextObj13.parent.child).to.equal(value);
        expect(nextObj14.parent.child).to.equal(value);

        const nextObj21 = deltaReducer(obj2, delta1);
        const nextObj22 = deltaReducer(obj2, delta2);
        const nextObj23 = deltaReducer(obj2, delta3);
        const nextObj24 = deltaReducer(obj2, delta4);

        expect(nextObj21.parent.child).to.equal(value);
        expect(nextObj22.parent.child).to.equal(value);
        expect(nextObj23.parent.child).to.equal(value);
        expect(nextObj24.parent.child).to.equal(value);

        const nextObj31 = deltaReducer(obj3, delta1);
        const nextObj32 = deltaReducer(obj3, delta2);
        const nextObj33 = deltaReducer(obj3, delta3);
        const nextObj34 = deltaReducer(obj3, delta4);

        expect(nextObj31.parent.child).to.equal(value);
        expect(nextObj32.parent.child).to.equal(value);
        expect(nextObj33.parent.child).to.equal(value);
        expect(nextObj34.parent.child).to.equal(value);
      });

      it("[Child:*] should DELETE the child, so that parent.child is 'undefined'", () => {
        const obj1 = {parent: {child: {val: "val"}}};
        const obj2 = {parent: {child: ["val"]}};
        const obj3 = {parent: {child: "val"}};

        const delta1 = {op: DELETE, path: path1};
        const delta2 = {op: DELETE, path: path2};
        const delta3 = {op: DELETE, path: path3};
        const delta4 = {op: DELETE, path: path4};

        const nextObj11 = deltaReducer(obj1, delta1);
        const nextObj12 = deltaReducer(obj1, delta2);
        const nextObj13 = deltaReducer(obj1, delta3);
        const nextObj14 = deltaReducer(obj1, delta4);

        expect(nextObj11.parent.child).to.be.an("undefined");
        expect(nextObj12.parent.child).to.be.an("undefined");
        expect(nextObj13.parent.child).to.be.an("undefined");
        expect(nextObj14.parent.child).to.be.an("undefined");

        const nextObj21 = deltaReducer(obj2, delta1);
        const nextObj22 = deltaReducer(obj2, delta2);
        const nextObj23 = deltaReducer(obj2, delta3);
        const nextObj24 = deltaReducer(obj2, delta4);

        expect(nextObj21.parent.child).to.be.an("undefined");
        expect(nextObj22.parent.child).to.be.an("undefined");
        expect(nextObj23.parent.child).to.be.an("undefined");
        expect(nextObj24.parent.child).to.be.an("undefined");

        const nextObj31 = deltaReducer(obj3, delta1);
        const nextObj32 = deltaReducer(obj3, delta2);
        const nextObj33 = deltaReducer(obj3, delta3);
        const nextObj34 = deltaReducer(obj3, delta4);

        expect(nextObj31.parent.child).to.be.an("undefined");
        expect(nextObj32.parent.child).to.be.an("undefined");
        expect(nextObj33.parent.child).to.be.an("undefined");
        expect(nextObj34.parent.child).to.be.an("undefined");
      });
    });
    describe("Parent: Array, Child: [Object, Array, Primitive]", () => {
      // these paths are equivalent
      const path1 = "/parent/0";
      const path2 = "/0/0";
      it("[Child:Object] should CREATE a new entry in the child with given key & value", () => {
        const obj = {parent: [{val: "val"}]};
        const value = ["newKey", "newValue"];

        const delta1 = {op: CREATE, path: path1, value};
        const delta2 = {op: CREATE, path: path2, value};

        const nextObj1 = deltaReducer(obj, delta1);
        const nextObj2 = deltaReducer(obj, delta2);

        expect(nextObj1.parent[0].newKey).to.equal(value[1]);
        expect(nextObj2.parent[0].newKey).to.equal(value[1]);
      });

      it("[Child:Array] should CREATE (append) a new element in the child with given value", () => {
        const obj = {parent: [["val"]]};
        const value = "newValue";

        const delta1 = {op: CREATE, path: path1, value};
        const delta2 = {op: CREATE, path: path2, value};

        const nextObj1 = deltaReducer(obj, delta1);
        const nextObj2 = deltaReducer(obj, delta2);

        expect(nextObj1.parent[0][1]).to.equal(value);
        expect(nextObj2.parent[0][1]).to.equal(value);
      });

      it("[Child:Primitive] should CREATE (append) new element in the father of this child with the given value", () => {
        const obj = {parent: ["val"]};
        const value = "newValue";

        const delta1 = {op: CREATE, path: path1, value};
        const delta2 = {op: CREATE, path: path2, value};

        const nextObj1 = deltaReducer(obj, delta1);
        const nextObj2 = deltaReducer(obj, delta2);

        expect(nextObj1.parent[1]).to.equal(value);
        expect(nextObj2.parent[1]).to.equal(value);
      });
      it("[Child:*] should UPDATE the child with given value", () => {
        const obj1 = {parent: [{val: "val"}]};
        const obj2 = {parent: [["val"]]};
        const obj3 = {parent: ["val"]};
        const value = "newValue";

        const delta1 = {op: UPDATE, path: path1, value};
        const delta2 = {op: UPDATE, path: path2, value};

        const nextObj11 = deltaReducer(obj1, delta1);
        const nextObj12 = deltaReducer(obj1, delta2);

        expect(nextObj11.parent[0]).to.equal(value);
        expect(nextObj12.parent[0]).to.equal(value);

        const nextObj21 = deltaReducer(obj2, delta1);
        const nextObj22 = deltaReducer(obj2, delta2);

        expect(nextObj21.parent[0]).to.equal(value);
        expect(nextObj22.parent[0]).to.equal(value);

        const nextObj31 = deltaReducer(obj3, delta1);
        const nextObj32 = deltaReducer(obj3, delta2);

        expect(nextObj31.parent[0]).to.equal(value);
        expect(nextObj32.parent[0]).to.equal(value);
      });

      it("[Child:*] should DELETE the child, so that parent.child is 'undefined'", () => {
        const obj1 = {parent: [{val: "val"}]};
        const obj2 = {parent: [["val"]]};
        const obj3 = {parent: ["val"]};

        const delta1 = {op: DELETE, path: path1};
        const delta2 = {op: DELETE, path: path2};

        const nextObj11 = deltaReducer(obj1, delta1);
        const nextObj12 = deltaReducer(obj1, delta2);

        expect(nextObj11.parent.length).to.equal(0);
        expect(nextObj12.parent.length).to.equal(0);

        const nextObj21 = deltaReducer(obj2, delta1);
        const nextObj22 = deltaReducer(obj2, delta2);

        expect(nextObj21.parent.length).to.equal(0);
        expect(nextObj22.parent.length).to.equal(0);

        const nextObj31 = deltaReducer(obj3, delta1);
        const nextObj32 = deltaReducer(obj3, delta2);

        expect(nextObj31.parent.length).to.equal(0);
        expect(nextObj32.parent.length).to.equal(0);
      });
    });
  });
});
