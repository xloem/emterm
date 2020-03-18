# emtern
emscripten setup to provide for in-browser terminal applications

If this is not finished, please fork and rewrite it to make it work.  This can just be a centralized place for people to find the solution.


## notes
It looks like a good way to do this is would be to make a javascript library to replace src/library_tty.js, and
the beginning of that is implemented by copying and modifying into library_emterm.js.
However, stdin and stdout are treated as if they are nonblocking.  The c/c++ library functions appear to assume
that they are blocking; unsure.
