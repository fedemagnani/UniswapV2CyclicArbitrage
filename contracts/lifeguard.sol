//SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

// import "./IUniswapV2Pair.sol";

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function name() external pure returns (string memory);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint) external;
    function transfer(address to, uint value) external returns (bool);
}

interface IERC20 {
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function approve(address spender, uint amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
}

interface IUniswapV2Factory {
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);
}

interface IUniswapV2Router {
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
}

contract Lifeguard{

    struct poolObject{
        string name;
        address pool;
        address[] tokens;
        uint112[] reserves;
        uint8[] decimals;
        string[] names;
    }

    struct poolsInADex{
        tokensAndPoolAddresses[] pools;
    }

    struct tokensAndPoolAddresses{
        address poolAddresses;
        address[] tokens;
    }

    function fetchAllPoolsAddress (address _uniswapFactory,uint _start, uint _end) public view returns(tokensAndPoolAddresses[] memory){
        uint _length = IUniswapV2Factory(_uniswapFactory).allPairsLength();
        uint _cap = _length>_end && _end!=0?_end:_length;
        uint _arrayLength =_cap-_start; 
        tokensAndPoolAddresses[] memory _allPoolsInThisDex = new tokensAndPoolAddresses[](_arrayLength);
        uint z = _start;
        for(uint j=0;j<_arrayLength;j++){
            address[] memory _tokens = new address[](2);
            try IUniswapV2Factory(_uniswapFactory).allPairs(z) returns(address _A){
                _allPoolsInThisDex[j].poolAddresses=_A;
                try IUniswapV2Pair(_A).token0() returns(address _B){
                    _tokens[0] = _B;
                    try IUniswapV2Pair(_A).token1() returns(address _C){
                        _tokens[1] = _C;
                    }catch{
                        (_tokens[0],_tokens[1]) =(address(0),address(0));
                    }
                }catch{
                    (_tokens[0],_tokens[1]) =(address(0),address(0));
                }
            }catch{
                _allPoolsInThisDex[j].poolAddresses=address(0);
                (_tokens[0],_tokens[1]) =(address(0),address(0));
            }
            // (_tokens[0],_tokens[1]) = (IUniswapV2Pair(_allPoolsInThisDex[j].poolAddresses).token0(),IUniswapV2Pair(_allPoolsInThisDex[j].poolAddresses).token1());
            _allPoolsInThisDex[j].tokens = _tokens;
            z+=1;
        }
        return _allPoolsInThisDex;
    } 

    function getPools(address [] memory _poolsAddresses) public view returns(poolObject[]memory){ 
        poolObject[]memory pools = new poolObject[](_poolsAddresses.length); 
        for(uint i=0;i<_poolsAddresses.length;i++){
            string memory _name = IUniswapV2Pair(_poolsAddresses[i]).name();
            address [] memory _tokens = new address[](2);
            uint112[] memory _reserves = new uint112[](2);
            uint8[] memory _decimals = new uint8[](2);
            string[] memory _names = new string[](2);
            uint32 timestamp;
            ( _tokens[0],_tokens[1]) = (IUniswapV2Pair(_poolsAddresses[i]).token0(),IUniswapV2Pair(_poolsAddresses[i]).token1());
            (_reserves[0], _reserves[1], timestamp) = IUniswapV2Pair(_poolsAddresses[i]).getReserves();
            (_decimals[0],_decimals[1]) = (IERC20(_tokens[0]).decimals(),IERC20(_tokens[1]).decimals());
            (_names[0],_names[1]) = (IERC20(_tokens[0]).name(),IERC20(_tokens[1]).name());
            pools[i]=poolObject(_name,_poolsAddresses[i],_tokens,_reserves,_decimals,_names);
        }
        return pools;
    }

    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');
    }

    function getReservesP(address _poolAddress, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(_poolAddress).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function getAmountOutP(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        // require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn*997;
        uint numerator = amountInWithFee*reserveOut;
        uint denominator = (reserveIn*1000)+amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountsOutP(uint amountIn, address[] memory _poolAddresses, address[]memory _tokenPath) internal view returns (uint[] memory amounts) {
        require(_tokenPath.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](_tokenPath.length);
        amounts[0] = amountIn;
        for (uint i; i < _tokenPath.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReservesP(_poolAddresses[i], _tokenPath[i], _tokenPath[i + 1]);
            amounts[i + 1] = getAmountOutP(amounts[i], reserveIn, reserveOut);
        }
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::transferFrom: transferFrom failed'
        );
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');
    }

    function _swapP(uint[] memory amounts, address[]memory _poolAddresses, address[]memory _tokenPath, address _to) internal virtual {
        for (uint i; i < _tokenPath.length - 1; i++) {
            (address input, address output) = (_tokenPath[i], _tokenPath[i + 1]);
            (address token0,) = sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < _tokenPath.length - 2 ? _poolAddresses[i+1] : _to;
            IUniswapV2Pair(_poolAddresses[i]).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }

    // function swapExactETHForTokensP(uint _amountIn,address[]memory _poolAddresses, address[]memory _tokenPath, address to) public payable returns (uint[] memory _amounts){
    //     _amounts = getAmountsOutP(_amountIn,_poolAddresses,_tokenPath);
    //     IWETH(_tokenPath[0]).deposit{value: _amounts[0]}();
    //     assert(IWETH(_tokenPath[0]).transfer(_poolAddresses[0], _amounts[0]));
    //     _swapP(_amounts, _poolAddresses, _tokenPath, to);
    // }

    // function swapExactTokensForETHP(uint _amountIn, address[]memory _poolAddresses, address[]memory _tokenPath, address to) public payable returns (uint[] memory _amounts){
    //     _amounts =  getAmountsOutP(_amountIn,_poolAddresses,_tokenPath);
    //     safeTransferFrom(
    //         _tokenPath[0], address(this), _poolAddresses[0], _amounts[0]
    //     );
    //     _swapP(_amounts, _poolAddresses, _tokenPath, address(this));
    //     IWETH(_tokenPath[_tokenPath.length-1]).withdraw(_amounts[_amounts.length - 1]);
    //     safeTransferETH(to, _amounts[_amounts.length - 1]);
    // }

    receive() external payable {}

    fallback() external payable {}

    function swapExactETHForTokensForETHP(uint _amountIn,address[]memory _poolAddresses, address[]memory _tokenPath, address to, bool _requiresWrap) public payable returns (uint[] memory _amounts){
        _amounts = getAmountsOutP(_amountIn,_poolAddresses,_tokenPath);
        if(_requiresWrap){
            IWETH(_tokenPath[0]).deposit{value: _amounts[0]}();
        }
        assert(IWETH(_tokenPath[0]).transfer(_poolAddresses[0], _amounts[0]));
        _swapP(_amounts, _poolAddresses, _tokenPath, address(this));
        // require(_amounts[_amounts.length-1]<IERC20(_tokenPath[_tokenPath.length-1]).balanceOf(msg.sender),"Amount out e maggiore del saldo");
        // uint _balance = IERC20(_tokenPath[0]).balanceOf(address(this));
        // require(IERC20(_tokenPath[0]).approve(address(this), _amounts[_amounts.length - 1]),"Approve failed");
        if(_requiresWrap){
            IWETH(_tokenPath[0]).withdraw(_amounts[_amounts.length - 1]);
        }
        safeTransferETH(to, _amounts[_amounts.length - 1]);
    }

    function multipleSwapOnlyPools(address[]memory _orderedTokenAddresses, address[]memory _orderedPoolAddresses, bool _requiresWrap, bool _test) public payable returns(uint[] memory){
        uint lastOutput = msg.value;
        uint[] memory _amounts;
        _amounts = swapExactETHForTokensForETHP(lastOutput, _orderedPoolAddresses, _orderedTokenAddresses, msg.sender, _requiresWrap);
        require(_amounts[_amounts.length-1]>msg.value || _test, "Arbitrage failed");
        return _amounts;
    }

    function multipleSwapMultiUni(address[]memory _orderedTokenAddresses, address[]memory _orderedUniswapRouters, bool _test) public payable returns(uint[] memory){
        //forse il metodo migliore è interagire direttamente con la pool
        uint lastOutput = msg.value;
        uint[] memory _amounts;
        for(uint i=0; i<_orderedTokenAddresses.length-1;i++){
            require(IERC20(_orderedTokenAddresses[i]).approve(_orderedUniswapRouters[i], type(uint256).max),"Approve Failed!");
            address[] memory _swapPath = new address[](2); 
                _swapPath[0]=_orderedTokenAddresses[i];
                _swapPath[1]=_orderedTokenAddresses[i+1];
                if(i==0){
                    //this would be surely the first swap

                    _amounts = IUniswapV2Router(_orderedUniswapRouters[i]).swapExactETHForTokens{value: msg.value}(0, _swapPath, address(this), block.timestamp+300);

                    // _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, address(this), block.timestamp+300);
                    lastOutput = _amounts[_amounts.length-1];
                }
                else if(i<_orderedTokenAddresses.length-2){
                    //these would be surely the mid swapss
                    _amounts = IUniswapV2Router(_orderedUniswapRouters[i]).swapExactTokensForTokens(lastOutput, 0, _swapPath, address(this), block.timestamp+300);
                    lastOutput = _amounts[_amounts.length-1];
                }else{
                    //this would be surely the last swap 
                    
                    _amounts = IUniswapV2Router(_orderedUniswapRouters[i]).swapExactTokensForETH(lastOutput, 0, _swapPath, msg.sender, block.timestamp+300);

                    // _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, msg.sender, block.timestamp+300);
                }
        }
        require(_amounts[_amounts.length-1]>msg.value || _test, "Arbitrage failed");
        return _amounts;
    }

    function multipleSwapUni(address[]memory _orderedTokenAddresses, address _uniswapRouter, bool _test) public payable returns(uint[]memory){
        uint lastOutput = msg.value;
        uint[] memory _amounts;
        for(uint i=0; i<_orderedTokenAddresses.length-1;i++){
            require(IERC20(_orderedTokenAddresses[i]).approve(_uniswapRouter, type(uint256).max),"Approve Failed!");
            address[] memory _swapPath = new address[](2); 
                _swapPath[0]=_orderedTokenAddresses[i];
                _swapPath[1]=_orderedTokenAddresses[i+1];
                if(i==0){
                    //this would be surely the first swap

                    _amounts = IUniswapV2Router(_uniswapRouter).swapExactETHForTokens{value: msg.value}(0, _swapPath, address(this), block.timestamp+300);

                    // _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, address(this), block.timestamp+300);
                    lastOutput = _amounts[_amounts.length-1];
                }
                else if(i<_orderedTokenAddresses.length-2){
                    //these would be surely the mid swapss
                    _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, address(this), block.timestamp+300);
                    lastOutput = _amounts[_amounts.length-1];
                }else{
                    //this would be surely the last swap 
                    
                    _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForETH(lastOutput, 0, _swapPath, msg.sender, block.timestamp+300);

                    // _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, msg.sender, block.timestamp+300);
                }
        }
        require(_amounts[_amounts.length-1]>msg.value || _test, "Arbitrage failed");
        return _amounts;
    }

    function multipleSwapUniCelo(address[]memory _orderedTokenAddresses, address _uniswapRouter, bool _test) public payable returns(uint[]memory){
        uint lastOutput = msg.value;
        uint[] memory _amounts;
        for(uint i=0; i<_orderedTokenAddresses.length-1;i++){
            require(IERC20(_orderedTokenAddresses[i]).approve(_uniswapRouter, type(uint256).max),"Approve Failed!");
            address[] memory _swapPath = new address[](2); 
                _swapPath[0]=_orderedTokenAddresses[i];
                _swapPath[1]=_orderedTokenAddresses[i+1];
                if(i==0){
                    //this would be surely the first swap

                    // _amounts = IUniswapV2Router(_uniswapRouter).swapExactETHForTokens{value: msg.value}(0, _swapPath, address(this), block.timestamp+300);

                    _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, address(this), block.timestamp+300);
                    lastOutput = _amounts[_amounts.length-1];
                }
                else if(i<_orderedTokenAddresses.length-2){
                    //these would be surely the mid swapss
                    _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, address(this), block.timestamp+300);
                    lastOutput = _amounts[_amounts.length-1];
                }else{
                    //this would be surely the last swap 
                    
                    // _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForETH(lastOutput, 0, _swapPath, msg.sender, block.timestamp+300);

                    _amounts = IUniswapV2Router(_uniswapRouter).swapExactTokensForTokens(lastOutput, 0, _swapPath, msg.sender, block.timestamp+300);
                }
        }
        require(_amounts[_amounts.length-1]>msg.value || _test, "Arbitrage failed");
        return _amounts;
    }
}