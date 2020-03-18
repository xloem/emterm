all: test.html

%.html: %.cpp library_emterm.js shell_emterm.html makefile
	emcc --js-library library_emterm.js --shell-file shell_emterm.html "$<" -o "$@"
