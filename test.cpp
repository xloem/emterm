#include <iostream>
#include <string>

int main()
{
	std::cout << "Hello, world!" << std::endl;
	std::cout << "Please enter your name: ";
	std::string name;
	std::cin >> name;
	std::cout << "Your name is " << name << "!" << std::endl;
}
