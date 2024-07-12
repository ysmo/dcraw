// dcraw.wasm.js
import { WASI } from "@wasmer/wasi";
import { WasmFs } from "@wasmer/wasmfs";

// 创建一个新的 WasmFs 实例，用于文件系统操作
const wasmFs = new WasmFs();

// 创建 WASI 实例并配置
const wasi = new WASI({
  // 环境变量
  env: {},
  // 预打开的目录
  preopens: {
    "/sandbox": "/some/real/path/that/exists",
  },
  // WASI 使用的文件系统
  fs: wasmFs.fs,
});

// WebAssembly 实例化选项，包括 WASI 导入对象
const importObject = {
  wasi_snapshot_preview1: wasi.wasiImport,
};

let dcrawWasm = null;

// 异步加载和实例化 WASM 模块
async function loadWasmModule() {
  const response = await fetch("dcraw.wasm");
  const bytes = await response.arrayBuffer();

  // 设置必要的 WASI 导入对象
  const importObj = {
    wasi_snapshot_preview1: {
      args_sizes_get: (argc_ptr, argv_ptr) => {
        // Emulate argv with an empty command line
        const enc = new TextEncoder();
        const argv = [enc.encode("dcraw")];

        // Write argc and argv sizes to memory
        new Uint32Array(dcrawWasm.exports.memory.buffer)[argc_ptr >> 2] =
          argv.length;
        new Uint32Array(dcrawWasm.exports.memory.buffer)[argv_ptr >> 2] =
          argv.reduce((acc, arg) => acc + arg.length + 1, 0);
      },
      args_get: (argc_ptr, argv_ptr) => {
        // Emulate argv with an empty command line
        const enc = new TextEncoder();
        const argv = [enc.encode("dcraw")];

        // Write argc and argv to memory
        new Uint32Array(dcrawWasm.exports.memory.buffer)[argc_ptr >> 2] =
          argv.length;
        let offset = argv_ptr;
        for (let i = 0; i < argv.length; i++) {
          new Uint32Array(dcrawWasm.exports.memory.buffer)[offset >> 2] =
            offset + 4;
          new Uint32Array(dcrawWasm.exports.memory.buffer)[(offset + 4) >> 2] =
            argv[i].length;
          offset += 4 + ((argv[i].length + 3) & ~3);
        }
      },
      environ_sizes_get: (environ_count_ptr, environ_size_ptr) => {
        // Emulate environ sizes with an empty environment
        new Uint32Array(dcrawWasm.exports.memory.buffer)[
          environ_count_ptr >> 2
        ] = 0;
        new Uint32Array(dcrawWasm.exports.memory.buffer)[
          environ_size_ptr >> 2
        ] = 0;
      },
      environ_get: (environ_ptr) => {
        // Emulate environ with an empty environment
        return 0; // Return null pointer (0) for an empty environment
      },
      fd_fdstat_get: (fd, buf_ptr) => {
        // Emulate fd_fdstat_get with basic data
        const fdstat = {
          filetype: 0, // Regular file
          flags: 0, // No flags set
        };
        new Uint8Array(dcrawWasm.exports.memory.buffer, buf_ptr, 8).set(
          new Uint8Array(Object.values(fdstat))
        );
        return 0; // Return success
      },
      fd_prestat_get: (fd, buf_ptr) => {
        // Emulate fd_prestat_get with basic data
        return -1; // Return error indicating unimplemented
      },
      fd_prestat_dir_name: (fd, path_ptr, path_len) => {
        // Emulate fd_prestat_dir_name with basic data
        return -1; // Return error indicating unimplemented
      },
      fd_close: () => {},
      fd_seek: () => {},
      fd_write: () => {},
      fd_read: () => {},
      proc_exit: () => {},
      // 添加 fd_fdstat_set_flags 函数的实现
      fd_fdstat_set_flags: () => {
        // Placeholder implementation
        return 0; // Return a dummy value
      },
      // 添加其他你需要的 WASI 导入函数
    },
  };

  // const { instance } = await WebAssembly.instantiate(bytes, importObj);

  const { instance } = await WebAssembly.instantiate(bytes, importObject);
  dcrawWasm = instance;
}

// 启动加载和实例化过程
loadWasmModule().catch((err) =>
  console.error("Failed to load wasm module:", err)
);

// 在浏览器环境下，为了便于调试和测试，将模块暴露给全局对象或者在模块导出中
if (typeof window !== "undefined") {
  window.dcrawWasm = dcrawWasm;
}

// 在 Node.js 环境下，将模块导出
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = dcrawWasm;
}
