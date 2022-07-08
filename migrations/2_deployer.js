const contract = artifacts.require("Lifeguard");

module.exports = function (deployer) {
  deployer.deploy(contract);
};
