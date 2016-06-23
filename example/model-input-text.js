/**
 * 文件描述
 * @author ydr.me
 * @create 2016-06-03 15:40
 */


'use strict';

var Model = require('../src/index');


var vm = new Model({
    el: '#demo',
    data: {
        abc: {
            def: 'example'
        }
    }
});


vm.watch('abc', function () {
    console.log(arguments);
});
