// Function to load files as binary, dataUrl or text blazingly fast by using chunking:
// - chunkSize: The chunk size to be used, in bytes. Default is 64K.
// - binary: If true chunks will be read through FileReader.readAsArrayBuffer
//   otherwise as FileReader.readAsText. Default is false. Overriden to true if you pass asDataUrl: true
// - asDataUrl: Pass true if you want to get your file as a DataUrl, i.e. base64 encoded.
//   Useful for image previews and sending stuff to JSON API's.
//   IMPORTANT: you have to add dataUrl declaration yourself, f.e. in input onChange handler:
//      if (file) {
//        this.encodedFile = `data:${file.type};base,`
//        parseFile(file, { asDataUrl: true, etc. })
//      }
// - onChunkRead: a function that accepts the read chunk
//   as its only argument. If binary option
//   is set to true, this function will receive
//   an instance of ArrayBuffer, otherwise a String
// - onChunkError: an optional function that accepts an object of type FileReader.error
// - success: an optional function invoked as soon as the whole file has been read successfully
//     <!--https://gist.githubusercontent.com/pineapplethief/075cb0ce9e6d1a6e80571036929f399e/raw/918e02357ec0f886bb9c62446f96886e5885227f/parseFile.js-->
export function parseFile(file, {
  chunkSize = 64 * 1024,
  binary = false,
  onChunkRead,
  onChunkError,
  success
} = {}) {
  let fileSize = file.size
  let offset = 0
  let readBlock = null

  let onLoadHandler = function(event) {
    let result = event.target.result

    if (event.target.error == null) {
      offset += binary ? event.target.result.byteLength : event.target.result.length
      if (onChunkRead) {
        onChunkRead(result)
      }
    } else {
      if (onChunkError) {
        onChunkError(event.target.error)
      }
      return
    }

    if (offset >= fileSize) {
      if (success) {
        success(file)
      }
      return
    }

    readBlock(offset, chunkSize, file)
  }

  readBlock = function(offset, length, file) {
    let fileReader = new FileReader()
    let blob = file.slice(offset, length + offset)
    fileReader.onload = onLoadHandler
    if (binary) {
      fileReader.readAsArrayBuffer(blob)
    } else {
      fileReader.readAsText(blob)
    }
  }

  readBlock(offset, chunkSize, file)
}