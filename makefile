all: test.html

%.html: %.cpp shell_emterm.html makefile
	emcc -s "EXTRA_EXPORTED_RUNTIME_METHODS=['TTY','FS']" --shell-file "shell_emterm.html" "$<" -o "$@"
