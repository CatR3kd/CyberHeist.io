{ pkgs }: {
	deps = [
		pkgs.mmh
pkgs.mongodb-3_4
pkgs.nodejs-16_x
        pkgs.nodePackages.typescript-language-server
        pkgs.nodePackages.yarn
        pkgs.replitPackages.jest
	];
}