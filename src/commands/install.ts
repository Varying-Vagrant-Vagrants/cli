import { Command } from "commander";
import { cli } from "../utils/cli.js";

export const installCommand = new Command("install")
  .description("Download and install VVV and prerequisites (coming soon)")
  .action(() => {
    cli.warning("The install command is coming soon.");
    console.log("");
    console.log("For now, please install VVV manually:");
    console.log("  1. Install Vagrant from https://www.vagrantup.com/");
    console.log("  2. Install VirtualBox or Docker Desktop");
    console.log("  3. Clone VVV: git clone https://github.com/Varying-Vagrant-Vagrants/VVV.git ~/vvv-local");
    console.log("  4. Run: cd ~/vvv-local && vagrant up");
  });
