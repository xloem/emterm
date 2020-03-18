all: test.html

%.html: %.cpp shell_emterm.html
	emcc --shell-file "shell_emterm.html" "$<" -o "$@"
