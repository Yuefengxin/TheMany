pragma solidity ^0.4.18; //We have to specify what version of compiler this code will use

contract theMany {
    
    mapping (bytes32 => uint8) public votesReceived;   // 每位选手所得票数    
    mapping (bytes32 => address[]) public votedPersons;// 每位选手的所有支持者
    mapping (address => uint256) public reward;        // 每位投票者是否获奖
    
    mapping (address=>bool) public voted;              //是否已经投票了
    address[] public keys; 

    bytes32[] public players;                          // 选手名单
   
    uint public betMoney = 100 finney;                  // 投注金额
    uint public deadline;                               // 截止期
    bool public voteClosed = false;                     // 投票是否结束
    address public holder;

    //总数量
    uint public candidateCount;
    //事件
    event votedEvent(
        bytes32 indexed candidate
    );
    // 转账
    function () public payable {
        require(!voteClosed, "error1");
        require(msg.value >= betMoney, "error2");
        if (msg.value > betMoney) {
            uint refundFee = msg.value - betMoney;
            msg.sender.transfer(refundFee);
        }
    }

    function claim() public {
        selfdestruct(this);
    }
    // 创建合约时声明选手名单以及投票时限
    constructor(bytes32[] _candidates, uint durationInMinutes) public {
        players = _candidates;
        deadline = now + durationInMinutes * 1 minutes;
        candidateCount = _candidates.length;
        holder = msg.sender;
    }
    function startVoting(uint durationInMinutes) public payable returns (bool){
        require(holder==msg.sender, "error5");
        require(voteClosed, "error6");
        for(uint i = 0; i < players.length; i++) {
            votesReceived[players[i]] = 0;
            delete votedPersons[players[i]];
        }
        uint keyIndex = 0;
        for (; keyIndex < keys.length; keyIndex++){
            address key = keys[keyIndex];
            delete voted[key];
        }
        delete keys;
        voteClosed = false;
        deadline = now + durationInMinutes * 1 minutes;
        return true;
    }
    // 每位选手所得票数
    function votesNum(bytes32 candidate) public view returns (uint8) {
        require(validPlayer(candidate));
        if(voteClosed){
            return votesReceived[candidate];
        }
        else{
            return 0;
        }
    }
    // 根据名字投票并下注
    function votePlayer(bytes32 candidate) public payable returns(bool){
        require(!voted[msg.sender], "error4");
        require(!voteClosed, "error1");
        require(msg.value >= betMoney, "error2");
        require(validPlayer(candidate), "error3");
        votesReceived[candidate] += 1;
        votedPersons[candidate].push(msg.sender);
        voted[msg.sender] = true;
        keys.push(msg.sender);
        reward[msg.sender] = 0;
        emit votedEvent(candidate);
        return true;
    }
    // 选手名是否合法
    function validPlayer(bytes32 candidate) public view returns (bool) {
        for(uint i = 0; i < players.length; i++) {
            if (players[i] == candidate) {
                return true;
            }
        }
        return false;
    }
    // 获取胜者的名字
    function getWinner() public afterDeadline view returns (bytes32 winner) {
        voteClosed = true;
        uint8 max = 0;
        for(uint i = 0; i < players.length; i++) {
            if (votesReceived[players[i]] > max) {
                max = votesReceived[players[i]];
                winner = players[i];
            }
        }
    }
    // 计算并获取投票正确者的奖金额
    function getRewardAmount() public payable returns (uint256 amount) {
        amount = 0;
        bytes32 winner = getWinner();
        if(validPlayer(winner)){
            amount = address(this).balance/votedPersons[winner].length;
            address[] temp = votedPersons[winner];
            for(uint i = 0; i < temp.length; i++){
                reward[temp[i]] += amount;
            }
        }
    }
    // 获取奖池金额
    function getBankBalance() public view returns(uint) {
        return address(this).balance;
    }
    // 定义函数修改器modifier来判断投票是否结束
    modifier afterDeadline() { if (now >= deadline) _; }
    // 投票结束后可拿回奖金
    function getRewards() public afterDeadline payable {
        if(voteClosed){
            uint256 amount = reward[msg.sender];
            if(amount >= 100 finney){
                msg.sender.transfer(amount);
                reward[msg.sender] = 0;
            }
            else if(!validPlayer(getWinner())){
                msg.sender.transfer(100000000000000000);
            }           
        }
    }
    function isOver() public view returns(bool){
        if (now >= deadline){
            return true;
        }
        return false;
    }
    function Now() public view returns(uint){
        return now;
    }
    function byte32ToString(bytes32 b) public view returns (string) {
        bytes memory names = new bytes(b.length);
        for(uint i = 0; i < b.length; i++) {    
            names[i] = b[i];
        }
        return string(names);
    }

}