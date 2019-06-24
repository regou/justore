
export function getMainKey (updatePath) {
  return typeof updatePath === 'string' ? updatePath.split('.')[0] : ''
}

/**
 * Split path string to [pathLastKey, pathParent]
 * @param {String} path - update path
 * @return {Array} pathPair - Array of [key,parentPath]
 */
export function splitLastKey (path) {
  let pathArr = path.split('.')
  if (pathArr.length >= 2) {
    let patentObjectPath = pathArr.splice(0, pathArr.length - 1) || []// pathArr -> key
    return [pathArr, patentObjectPath.join('.')]
  } else {
    return [pathArr]
  }
}
