# emtern
emscripten setup to provide for in-browser terminal applications

If this is not finished, please fork and rewrite it to make it work.  This can just be a centralized place for people to find the solution.


## notes
It looks like a good way to do this is would be to make a javascript library to replace src/library_tty.js, and
the beginning of that is implemented by copying and modifying into library_emterm.js.
However, stdin and stdout are treated as if they are nonblocking.  The c/c++ library functions appear to assume
that they are blocking; unsure.
It seems 'asyncify' is a way to make c/c++ code wait for javascript callbacks, if needed.
	The underlying standard library appears to assume that (FILE *)->read(f, &c, 1) will block on standard input.
So, for now, it seems things would work for nonblocking use, but I'd like to spend some more time seeing if blocking use is reasonable.
  It's likely the interface that offers functions to C that
  does the async conversion.  So we'd want the outermost javascript
  function converted, I guess.
