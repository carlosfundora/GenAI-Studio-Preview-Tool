## 2024-05-22 - Parallelizing File System Scans
**Learning:** Parallelizing high-level independent I/O tasks (like scanning different root directories) yields measurable gains, but parallelizing tight loops of synchronous FS checks (like `fs.existsSync`) creates overhead that outweighs benefits for small datasets (~100 items).
**Action:** Focus on parallelizing coarse-grained I/O operations first. Use `Promise.all` for distinct tasks, but stick to synchronous checks in tight loops unless the number of items is very large or the FS is slow.
