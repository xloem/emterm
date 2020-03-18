# emtern
emscripten setup to provide for in-browser terminal applications

If this is not finished, please fork and rewrite it to make it work.  This can just be a centralized place for people to find the solution.


## notes
after launch, the 'FS' and 'TTY' libraries are responsible for terminal input and output with user.
characters can be manually output with `let stdout = Module.FS.open('/dev/stdout'); stdout.stream_ops.write(stdout, [97,97,10], 0, 3, 0)`

it looks like these can be changed with `Module.TTY.register()`
