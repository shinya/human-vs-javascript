/**
 * Created by ssaita on 15/11/11.
 */
(function () {
    var adjustment = 20;

    /**
     * Util functions
     * 色んな所から使うであろうメソッドまとめました的な。
     * クラスではなく、functionのJSONです。
     *
     * @constructor
     */
    var Util = {
        randomX: function (base) {
            return parseInt((Math.random() * base - adjustment) + adjustment);
        },

        randomY: function (base) {
            return parseInt((Math.random() * base -adjustment) + adjustment);
        }
    };


    /**
     * Field クラス
     *
     * svgの領域を持ってます。以上。
     *
     * @constructor
     */
    Field = function (param) {
        var parent;
        if (param.parent) {

            parent = param.parent;
        } else {
            parent = 'body';
        }
        var div = d3.select(parent);

        this.width = Number(div.style('width').slice(0,-2));
        this.height = 600;

        this.svg = div.append('svg');

        for (var i in param) {
            this.svg.attr(i, param[i])
        }
    };

    Field.prototype.getField = function () {
        return this.svg;
    };

    Field.prototype.getWidth = function () {
        return this.width;
    };

    Field.prototype.getHeight = function () {
        return this.height;
    };


    /**
     * Target クラス
     *
     * Navigatorクラスが操作をする。動かない丸。
     * Trackerクラスがこいつを追い続ける。
     *
     * @constructor
     */
    Target = function (svg, limitX, limitY) {
        var colors = d3.scale.category10().range();

        var color = colors[parseInt(Math.random() * colors.length)];

        this.limitX = limitX;
        this.limitY = limitY;

        this.circle = svg.append('circle')
            .attr('r', 10)
            .attr('cx', Util.randomX(limitX))
            .attr('cy', Util.randomY(limitY))
            .attr('fill', color)
            .attr('id', 'target');
    };

    Target.prototype.move = function () {
        this.circle
            .attr('cx', Util.randomX(this.limitX))
            .attr('cy', Util.randomY(this.limitY));
    };

    Target.prototype.getPoint = function () {
        return {
            x: this.circle.attr('cx'),
            y: this.circle.attr('cy')
        }
    }


    /**
     * Trackerクラス
     *
     * ターゲットを追い続ける追跡者
     *
     * @param svg
     * @param navigator
     * @constructor
     */
    Tracker = function (svg, navigator, limitX, limitY) {

        this.circle = svg.append('circle')
            .attr('r', 5)
            .attr('cx', Util.randomX(limitX))
            .attr('cy', Util.randomY(limitY))
            .attr('fill', 'green')
            .attr('id', 'tracker');

        this.step = 5;
        this.maxForwardIndex = 17;
        this.currentPosition = this.getPoint();
        this.initialScore = [];

        this.history = [];
        this.score = [];
        for (var i = 1; i <= this.maxForwardIndex; i++) {
            this.history[i] = {
                queue: []
            };
            this.score[i] = 0;
        }

        this.moved = true;
        this.readMoveFlag = false;

        this.forwardMaster = {
            // 上段 （北西・北・北東）
            7: {x: -1, y: -1},
            8: {x: 0, y: -1},
            9: {x: 1, y: -1},

            // 中段 （西・ニュートラル・東）
            4: {x: -1, y: 0},
            5: {x: 0, y: 0},
            6: {x: 1, y: 0},

            // 下段 （南西・南・南東）
            1: {x: -1, y: 1},
            2: {x: 0, y: 1},
            3: {x: 1, y: 1},

            // 北北西と北北東
            10: {x: -1, y: -2},
            11: {x: 1, y: -2},

            // 西北西と東北東
            12: {x: -2, y: -1},
            13: {x: 2, y: -1},

            // 西南西と東南東
            14: {x: -2, y: 1},
            15: {x: 2, y: 1},

            // 南南西と南南東
            16: {x: -1, y: 2},
            17: {x: 1, y: 2}

        };

        this.navigator = navigator;
    };

    /**
     * 現在座標を返す
     * @returns {{x: Number, y: Number}}
     */
    Tracker.prototype.getPoint = function () {
        return {
            x: parseInt(this.circle.attr('cx')),
            y: parseInt(this.circle.attr('cy'))
        }
    };


    /**
     * 移動スコアを計算する
     * @param forward
     * @returns {number}
     */
    Tracker.prototype.mathScore = function (forward) {
        var i;
        var count = 0;
        var sum = 0;

        while (this.history[forward].queue.length > this.step * 2) {
            this.history[forward].queue.shift();
        }

        // その方向の要素を全て洗う
        for (i in this.history[forward].queue) {
            sum += this.history[forward].queue[i].line;
            count++;
        }

        // 最後の要素だけをもう一回
        sum += this.history[forward].queue[i].line;
        count++;

        // 指数移動平均スコアを求める
        return (sum / count);
    };

    /**
     * 移動処理
     * @param forward
     * @param seed
     */
    Tracker.prototype.move = function (forward, seed) {
        var tr = this.getPoint();
        tr.x += this.forwardMaster[forward].x * seed;
        tr.y += this.forwardMaster[forward].y * seed;

        this.circle.attr('cx', tr.x).attr('cy', tr.y);

    };

    Tracker.prototype.directMove = function (x, y) {
        var tr = this.getPoint();
        tr.x += x;
        tr.y += y;

        this.circle.transition().duration(200).attr('cx', tr.x).attr('cy', tr.y)
            .each('end', function () {
                this.readMoveFlag = false;
                ;
            });
        ;
    };

    /**
     * 移動スコアを格納する
     *
     * @param forward
     * @param seed
     */
    Tracker.prototype.loggedScore = function (forward, seed) {

        // 移動スコアを求める
        var score = this.navigator.forwardScore(this.forwardMaster[forward], seed, this);

        // 今動いたスコアを方向のデータとともに格納する
        this.history[forward].queue.push(score);
        this.score[forward] += score.line;

    };


    /**
     * 移動したスコアを記録していく
     *
     * @param forward
     * @param seed
     */
    Tracker.prototype.moveAndLogging = function (forward, seed) {
        // スコアを計算して記録する
        this.loggedScore(forward, seed);

        // 移動する
        this.move(forward, seed);

    }


    /**
     * 判定
     *
     * @returns {number}
     */
    Tracker.prototype.judge = function () {

        var scoreArr = [];
        var maxIndex = 1;
        var minIndex = 1;

        for (var i = 1; i <= this.maxForwardIndex; i++) {
            if (i != 5) {
                scoreArr[i] = this.mathScore(i);

                if (scoreArr[maxIndex] <= scoreArr[i]) {
                    maxIndex = i;
                }
                if (scoreArr[minIndex] >= scoreArr[i]) {
                    minIndex = i;
                }
            }
        }

        // ここに来た時点で、スコアが高いforward値が求められている
        return maxIndex;
    };

    // どの方向にいけばターゲットに近づけるかを調べる

    /**
     * どの方向に行けばターゲットに
     * 近づけるかを調べる
     *
     * @param seed
     */
    Tracker.prototype.check = function (seed) {


        // 一旦リセット
        for (var j = 1; j <= this.maxForwardIndex; j++) {
            this.history[j].queue = [];
            this.score[j] = 0;
        }

        var i = 1;
        while (i <= this.maxForwardIndex) {
            if (this.history[i].queue.length > this.step) {
                i++;
                continue;
            } else {
//				var buf = parseInt( Math.random() * this.maxForwardIndex) + 1;
                var buf = i;
                if (this.history[buf].queue.length <= 5) {
                    this.loggedScore(buf, seed);
                }
            }
        }


        // ターゲットに到達して、赤の点が移動した時に真になる
        if (this.moved) {
            // 値が変わってはダメなのでコピー渡しをする
            this.initialScore = $.extend(true, {}, this.score);
            this.moved = false;
//			console.log('initのスコア: ', this.score[1]);
        } else {
//			console.log('1のスコア: ', this.initialScore[1]);
        }


    }


    Tracker.prototype.sendScore = function () {
        var initial = this.currentPosition;
        var answer = this.navigator.askAnswer();
        var differ = {
            x: initial.x - answer.x,
            y: initial.y - answer.y
        };
        var initialScore = $.extend(true, {}, this.initialScore);

        if (differ.x == differ.y) {
            console.log('own!！', differ.x, this.initialScore[1]);
        }

        this.currentPosition = answer;
        this.moved = true;
    };

    Tracker.prototype.hasMoved = function () {
        this.moved = true;
    }


    /* ==================================================
     *  Navigatorクラス
     *  標的の状態を把握し、追跡者からの問い合わせに答える。
     * ===================================================
    */

    /**
     * コンストラクタ
     *
     * @param target
     * @constructor
     */
    Navigator = function (target) {
        this.humanGameScore = 0;
        this.cpGameScore = 0;

        this.humanContinuousNumber = 0;
        this.cpContinuousNumber = 0;

        this.isLoop = false;

        // CPUを待機させる時間最初は500
        this.delay = 500;

        this.target = target;
    }

    /**
     * ターゲットとの距離を計算する
     *
     * @param tracker
     * @param master
     * @param seed
     * @returns {{x: number, y: number}}
     */
    Navigator.prototype.toTargetDistance = function (tracker, master, seed) {
        var trPoint = tracker.getPoint();
        var taPoint = this.target.getPoint();

        var biasX = 0;
        var biasY = 0;
        if (master && seed) {
            biasX = master.x * seed;
            biasY = master.y * seed;
        }

        var result = {
            x: Math.abs(trPoint.x - taPoint.x + biasX),
            y: Math.abs(trPoint.y - taPoint.y + biasY)
        }

        result['line'] = Math.sqrt(Math.pow(result.x, 2) + Math.pow(result.y, 2));

        return result;
    };


    /**
     * 答えを教える
     *
     * @returns {*|{x: Number, y: Number}}
     */
    Navigator.prototype.askAnswer = function () {
        return this.target.getPoint();
    }


    /**
     * ターゲットの場所についたかどうか確認する
     * 現状は中心点の5px以内なら到達と判断する
     *
     * @returns {boolean}
     */
    Navigator.prototype.isArrived = function (tracker) {
        if (this.toTargetDistance(tracker).line < 10) {
            return true;
        } else {
            return false;
        }
    }


    /**
     * 追跡者の情報を受け取り、ターゲットに近づいたかどうかを
     * 方向ごとにスコアで教える
     *
     * @param master
     * @param seed
     * @param tracker
     * @returns {{x: number, y: number, line: number}}
     */
    Navigator.prototype.forwardScore = function (master, seed, tracker) {
        var before = this.toTargetDistance(tracker);
        var after = this.toTargetDistance(tracker, master, seed);

        var score = {
            x: before.x - after.x,
            y: before.y - after.y,
            line: before.line - after.line
        }

        return score;
    }


    /**
     * ターゲットをランダムな座標に動かす
     */
    Navigator.prototype.targetMove = function () {
        this.target.move();
    };


    /**
     * 人側のスコアを増やす
     */
    Navigator.prototype.humanPlus = function () {
        this.humanGameScore++;

        this.humanContinuousNumber++;
        this.cpContinuousNumber = 0;

        $('#human_score').text(this.humanGameScore);

        if(this.humanContinuousNumber >= 3){
            // CPUの待機時間を減らす
            this.decrementDelay();
            this.humanContinuousNumber = 0;
        }

        $('#human_continuous').text(this.humanContinuousNumber);
        $('#cp_continuous').text(this.cpContinuousNumber);
    }


    /**
     * CPU側のスコアを増やす
     */
    Navigator.prototype.cpPlus = function () {
        this.cpGameScore++;

        this.humanContinuousNumber = 0;
        this.cpContinuousNumber++;

        $('#ai_score').text(this.cpGameScore);
        $('#human_continuous').text(this.humanContinuousNumber);
        $('#cp_continuous').text(this.cpContinuousNumber);

        // 5回連続で負けるとゲーム終了
        if(this.cpContinuousNumber >= 5){
            this.desableLoop();
        }

    }

    Navigator.prototype.getDelay = function() {
        return this.delay;
    }

    Navigator.prototype.decrementDelay = function() {
        var substract = this.delay / 10;

        this.delay = this.delay - substract;
        $('#fps').text(parseInt(1000 / this.delay));
        return this.delay;
    }

    Navigator.prototype.getloopStatus = function() {
        return this.isLoop;
    }


    Navigator.prototype.desableLoop = function() {
        this.isLoop = false;

    }

    Navigator.prototype.ebableLoop = function() {
        this.isLoop = true;
    }


        /**
     * メイン処理
     *
     * @param svg
     */
    function main(field) {
        var svg = field.getField();
        var target = new Target(svg, field.getWidth(), field.getHeight());
        var navigator = new Navigator(target);
        var tracker = new Tracker(svg, navigator, field.getWidth(), field.getHeight());

        var seed = 5;

        // setIntervalのfunctionを格納
        var interval;
        var i = 0;

        var moveProcess = function () {

            // 読み込み移動が発生した場合は検索処理を止めるためにフラグ管理する
            if (!this.readMoveFlag) {
                if (i % 10 == 0) {
                    // 自分の周りを歩き回って、その評価を得る
                    tracker.check(seed);
                }

                // 到着したかどうかを判定する。まだなら捜索を続ける
                if (navigator.isArrived(tracker)) {

                    // 到着していたら、点数をプラスして次の場所へ
                    navigator.cpPlus();
                    // 到着した場所を記録
                    tracker.sendScore();

                    // ターゲットを再配置
                    navigator.targetMove();
                    tracker.check(seed);
                } else {
                    tracker.moveAndLogging(tracker.judge(), seed);
                }

            }

            if(navigator.getloopStatus()){
                i++;
                setTimeout(moveProcess, navigator.getDelay());
            }else{
                $('#result-score').text($('#human_score').text());
                $('#result-fps').text($('#fps').text());
                $('#resultModal').modal('show');
            }

        };

        function start(){
            navigator.ebableLoop();
            // CPUを動かす
            moveProcess(navigator.getDelay());
        }

        function stop(){
            navigator.desableLoop();
        }

        $('#start').click(function () {
            start();
            return false;
        });

        $('#move').click(function () {
            navigator.targetMove();
            tracker.hasMoved();
        });

        $('#target').mouseover(function () {
            navigator.humanPlus();
            navigator.targetMove();
        });

        $('#stop').click(function () {
            stop();
        });

        $('#start-game').click(function(){
            $('#overviewModal').modal('hide');

            setTimeout(start, 500);
        });

        $('.reload').click(function(){
            location.reload();
        });

    }


    // START
    $(document).ready(function () {
        // svg 領域の定義
        var field = new Field({
            id: 'svg_area',
            parent: '#field'
        });

        main(field);

        $('#overviewModal').modal({
            backdrop: 'static', keyboard: false, show: true
        });
    });
})();