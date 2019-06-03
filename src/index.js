/* eslint-disable default-case */
/* eslint-disable no-useless-escape */
/* eslint-disable prefer-destructuring */
const validPathRegex = new RegExp(/^\/([a-zA-z0-9\_]+[a-zA-z0-9\_\/]*)+$/);
const validOperations = ['CREATE', 'UPDATE', 'DELETE'];
const VALIDATION_ERROR = 'VALIDATION_ERROR';
/**
 *
 *
 * @param {*} object
 * @param {*} delta
 * @param {boolean} [options={mutateObject: false}]
 * @returns
 */
const deltaReducer = (object, delta, options = { mutateObject: false }) => {
  const { path, op, value } = delta;
  const { mutateObject } = options;
  const [CREATE, UPDATE, DELETE] = validOperations;
  const workingCopy = mutateObject ? object : Object.assign({}, object);

  // handle invalid inputs
  const error = new Error();
  error.code = VALIDATION_ERROR;

  if (Array.isArray(object) || typeof object !== 'object') {
    error.message = `invalid object, '${object}' is not an object`;
    throw error;
  }

  if (Object.keys(object).length === 0) {
    error.message = 'invalid object {}, object should have at least one entry';
    throw error;
  }

  if (validOperations.indexOf(op) === -1) {
    error.message = `Unknown operation, 'delta.op = ${op}'`;
    throw error;
  }
  if (!path) {
    error.message = 'delta.path cannot be undefined';
    throw error;
  }
  if (!validPathRegex.test(path.trim())) {
    error.message = 'Invalid delta.path, path should contain valid object keys';
    throw error;
  }

  // parse the path
  const steps = path
    .split('/')
    .filter(entry => entry !== '')
    .map(entry => (/\d+$/.test(entry) ? parseInt(entry, 10) : entry));

  let prevStep = workingCopy;
  let currStep;
  let accessorKey;

  for (let i = 0; i < steps.length; i += 1) {
    if (typeof steps[i] === 'string') {
      currStep = prevStep[steps[i]];
      accessorKey = steps[i];
    } else if (typeof steps[i] === 'number') {
      if (Array.isArray(prevStep)) {
        currStep = prevStep[steps[i]];
        accessorKey = steps[i];
      } else if (typeof prevStep === 'object' && Object.keys(prevStep).length !== 0) {
        currStep = Object.entries(prevStep)[steps[i]][1];
        accessorKey = Object.entries(prevStep)[steps[i]][0];
      }
    }
    if (i !== steps.length - 1) {
      prevStep = currStep;
    }
  }

  // child = f(parent,accessorKey)
  const f = { parent: prevStep, child: currStep, accessorKey };
  // handle the case of associative array
  if (Array.isArray(f.parent) && typeof accessorKey === 'string') {
    error.message = `Invalid path, please use numeric key to target array element`;
    throw error;
  }

  // execute actions
  if (Array.isArray(f.parent)) {
    if (Array.isArray(f.child)) {
      // parent:Array, child:Array
      switch (op) {
        case CREATE:
          f.child.push(value);
          break;
        case UPDATE:
          f.parent[accessorKey] = value;
          break;
        case DELETE:
          f.parent.splice(f.accessorKey, 1);
          break;
      }
    } else if (typeof f.child === 'object') {
      // parent:Array, child:Object
      switch (op) {
        case CREATE:
          f.child[value[0]] = value[1];
          break;
        case UPDATE:
          f.parent[accessorKey] = value;
          break;
        case DELETE:
          f.parent.splice(f.accessorKey, 1);
          break;
      }
    } else {
      // parent:Array, child:Primitive
      switch (op) {
        case CREATE:
          f.parent.push(value);
          break;
        case UPDATE:
          f.parent[accessorKey] = value;
          break;
        case DELETE:
          f.parent.splice(f.accessorKey, 1);
          break;
      }
    }
  } else if (typeof f.parent === 'object') {
    if (Array.isArray(f.child)) {
      // parent:Object, child:Array
      switch (op) {
        case CREATE:
          f.child.push(value);
          break;
        case UPDATE:
          f.parent[accessorKey] = value;
          break;
        case DELETE:
          delete f.parent[f.accessorKey];
          break;
      }
    } else if (typeof f.child === 'object') {
      // parent:Object, child:Object
      switch (op) {
        case CREATE:
          f.child[value[0]] = value[1];
          break;
        case UPDATE:
          f.parent[accessorKey] = value;
          break;
        case DELETE:
          delete f.parent[f.accessorKey];
          break;
      }
    } else {
      // parent:Object, child:Primitive
      switch (op) {
        case CREATE:
          f.parent[value[0]] = value[1];
          break;
        case UPDATE:
          f.parent[accessorKey] = value;
          break;
        case DELETE:
          delete f.parent[accessorKey];
          break;
      }
    }
  }

  /** * Unreachable ** */
  // else {
  //   throw new Error("Parent cannot be 'primitive', something went wrong while parsing the given 'path'");
  // }

  return workingCopy;
};

module.exports = deltaReducer;
