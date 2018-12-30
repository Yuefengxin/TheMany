var theMany = artifacts.require("./theMany.sol");

module.exports = function(deployer) {
  deployer.deploy(theMany, ['Jack Chen', 'Grindelwald', 'Dumbledore', 'Wenzil', 'Romeo', 'Juliet'], [15],{
    gas: 6700000
  });
};