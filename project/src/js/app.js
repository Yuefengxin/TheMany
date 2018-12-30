var isshow = false;
var getWin = false;
App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
 
  init: function() {
    return App.initWeb3();
  },
 
  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      console.warn("Meata");
    }else{
      App.web3Provider = new Web3.providers.HttpProvider('https://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
 
    return App.initContract();
  },
 
  initContract: function() {
 
    $.getJSON("theMany.json",function(themany){
 
      App.contracts.theMany = TruffleContract(themany);
      App.contracts.theMany.setProvider(App.web3Provider);
 
      App.listenForEvents();
      App.showNum();
      return App.reander();
    })
 
  },
 
  reander: function(){
    
    var theManyInstance;
    var $load = $("#load");
    var $content = $("#content");
    var $tip = $("#tip");
 
    $load.show();
    $content.hide();
    $tip.hide();
 
    //获取账号信息
    web3.eth.getCoinbase(function(err,account){
      if(err === null){
        App.account = account;
        $("#address").html("当前账号: " + account);
      }
    });
 
    //加载数据
    App.contracts.theMany.deployed().then(function(instance){
      theManyInstance = instance;
      return theManyInstance.candidateCount();
    }).then(function(count){
      var $players = $("#players");
      if(!isshow){
        isshow = true;
      } else{
        return;
      }
      $players.empty();
      var $playersSelect = $("#playersSelect");
      $playersSelect.empty();

      // 更新投票结果信息显示
      for (var i=0;i<count;i++){
        var promise = Promise.resolve(i);
        promise.then(function(i){
          theManyInstance.players(i).then(function(player){
            theManyInstance.byte32ToString.call(player).then(function(name){
              theManyInstance.votesNum.call(player).then(function(voteCount){
                var j = i + 1;
                var playerTemplate = "<tr><th>"+j+"</th><th>"+name+"</th><th>"+voteCount+"</th></tr>";
                $players.append(playerTemplate);
                var playerOption = "<option value='"+name+"'>"+name+"</option>";
                $playersSelect.append(playerOption);
                isshow = false;
              });
            });
          });
        });
      }
 
      return theManyInstance.voted(App.account);
 
    }).then(function(hasVoted){
      if(hasVoted){
        $('form').hide();
      }
      $load.hide();
      $content.show();
      $tip.show();
 
    }).catch(function(err){
      console.warn(err);
    });
 
  },
 
  //投票并下注
  dealVote: function(){
 
    var $load = $("#load");
    var $content = $("#content");
 
    var playerName = $('#playersSelect').val();
 
    App.contracts.theMany.deployed().then(function(instance){
      return instance.votePlayer(playerName,{from: App.account, value:100000000000000000});
    }).then(function(result){
      $content.hide();
      $load.show();
    }).catch(function(err){
      console.warn(err);
    });
 
  },
 
  //监听事件
  listenForEvents: function(){
    App.contracts.theMany.deployed().then(function(instance){
      instance.votedEvent({},{
       formBlock:0,
       toBlock: 'latest'
      }).watch(function(error,event){
        console.log("event triggered",event);
        App.reander();
      });
    })
  },

  showNum: function(){
    var theManyInstance;
    App.contracts.theMany.deployed().then(function(instance){
      theManyInstance = instance;
      theManyInstance.deadline().then(function(time){
        theManyInstance.Now().then(function(now){
          console.log("now",now);
        });
        console.log("time",time);
      });
      return theManyInstance.isOver();
    }).then(function(isOver){
      if(!isOver){
        console.log("voting");
        return;
      }
      console.log("isOver");
      $("#tips").html("投票已结束。等待计算结果。");
      $('form').hide();
      theManyInstance.voteClosed().then(function(isClosed){
        if(isClosed){
          var $getr = $("#getr");
          $getr.show();
          $("#restart").show();
          if(!getWin){
            theManyInstance.getWinner().then(function(winner){
              theManyInstance.byte32ToString.call(winner).then(function(name){
                if(name == ""){
                  $("#tips").html("投票已结束，未投出胜利者。 现在可以拿回下注。");
                }
                else{
                  $("#tips").html("投票已结束，胜利者是: "+name+"。 现在可以拿回奖金。");
                }
                console.log("Winner:", name);
              });
            });
            getWin = true;
          }       
        } else{
          $("#count").show();
        }
      });
      
    });
  },

  getMoney: function(){
    var theManyInstance;
    App.contracts.theMany.deployed().then(function(instance){
      theManyInstance = instance;
      return theManyInstance.voteClosed();
    }).then(function(isClosed){
      if(isClosed){
        theManyInstance.reward.call(App.account).then(function(num){
          num /= Math.pow(10, 15);
          console.log("rewards", num);
          if(num == 0){
            confirm("您的待取奖金金额为"+num+"。")
          }
          else if(confirm("您的待取奖金金额为"+num+" finney，是否确定取出？") && num != 0){
            theManyInstance.getRewards({from: App.account}).then(function(result){
              console.log("get rewards");
            }).catch(function(err){
              console.warn(err);
            });
          }
        });
      }
    });
  },

  reStart: function(){
    var theManyInstance;
    App.contracts.theMany.deployed().then(function(instance){
      theManyInstance = instance;
      return theManyInstance.voteClosed();
    }).then(function(isClosed){
      if(isClosed){
        var time = parseInt(prompt("请输入投票持续时间（单位为分钟）", "")); 
        console.log(time);
        if(!isInteger(time)){
          console.log(time);
          alert("请输入正确的数字！");  
          return;
        }
        theManyInstance.holder().then(function(holder){
          if(App.account != holder){
            console.log(holder);
            alert("开启失败，您没有权限！"); 
            return;
          }
          theManyInstance.startVoting(time, {from: App.account}).then(function(status){
            console.log("rewards", status);
            if(status){
              App.showNum();
            }
            else {
              alert("重启失败，投票未结束"); 
            }
          }).catch(function(err){
            console.warn(err);
          });
        });
      }
      else{
        console.log("is voting");
      }
    });
  },

  getRewardAmount: function(){
    var theManyInstance;
    App.contracts.theMany.deployed().then(function(instance){
      theManyInstance = instance;
      return theManyInstance.isOver.call();
    }).then(function(isOver){
      if(!isOver)
        return;     
      theManyInstance.holder().then(function(holder){
        if(App.account == holder){
          theManyInstance.getRewardAmount().then(function(amount){
            App.reander();
            $("#count").hide();
          });
        }
        else{
          alert("计算结果失败，您没有权限！"); 
        }
      });
    });
  }
};
 
$(function() {
  $(window).load(function() {
    App.init();
    $("#getr").hide();
    $("#restart").hide();
    $("#count").hide();
    setInterval(App.showNum, 60*1000);
  });
});

function isInteger(obj) {
  return typeof obj === 'number' && obj % 1 === 0
}