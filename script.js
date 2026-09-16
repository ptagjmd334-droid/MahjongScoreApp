const setupScreen =
  document.getElementById("setup-screen");

const confirmScreen =
  document.getElementById("confirm-screen");

const gameScreen =
  document.getElementById("game-screen");

const goConfirmButton =
  document.getElementById("go-confirm-button");

const backSetupButton =
  document.getElementById("back-setup-button");

const startGameButton =
  document.getElementById("start-game-button");

const setupError =
  document.getElementById("setup-error");

const dealerButtons =
  document.querySelectorAll(".dealer-select");

const riichiButtons =
  document.querySelectorAll(".riichi-button");

const playerPanels =
  document.querySelectorAll(".player-panel");

const agariButton =
  document.getElementById("agari-button");

const ryukyokuButton =
  document.getElementById("ryukyoku-button");

const agariOverlay =
  document.getElementById("agari-overlay");

const agariFlowTitle =
  document.getElementById("agari-flow-title");

const agariFlowContent =
  document.getElementById("agari-flow-content");

const agariCancelButton =
  document.getElementById("agari-cancel-button");

const riichiCancelModal =
  document.getElementById("riichi-cancel-modal");

const riichiCancelText =
  document.getElementById("riichi-cancel-text");

const riichiCancelBack =
  document.getElementById("riichi-cancel-back");

const riichiCancelConfirm =
  document.getElementById("riichi-cancel-confirm");


const positions = [
  "bottom",
  "right",
  "top",
  "left"
];


const normalFuList = [
  20,
  25,
  30,
  40,
  50
];


const highFuList = [
  60,
  70,
  80,
  90,
  100,
  110
];


let dealerPosition =
  "bottom";

let currentPlayers =
  {};

let initialRanks =
  {};

let cancellingRiichiPosition =
  null;


/* ========================================
   対局状態
======================================== */

const gameState = {

  scores: {
    top: 25000,
    right: 25000,
    bottom: 25000,
    left: 25000
  },

  riichi: {
    top: false,
    right: false,
    bottom: false,
    left: false
  },

  kyotaku: 0,

  honba: 0

};


/* ========================================
   アガリ入力状態
======================================== */

const agariFlow = {

  active: false,

  step: null,

  type: null,

  winners: [],

  discarder: null,

  addingWinner: false,

  currentWinnerIndex: 0,

  currentScoreSelection: null,

  scoreResults: {},

  showHighFu: false

};


/* ========================================
   親選択
======================================== */

dealerButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        dealerButtons.forEach(
          (item) => {

            item.classList.remove(
              "active"
            );

            item.textContent =
              "親にする";

          }
        );


        button.classList.add(
          "active"
        );

        button.textContent =
          "親";


        dealerPosition =
          button.dataset.position;

      }
    );

  }
);


/* ========================================
   名前取得
======================================== */

function getPlayers() {

  return {

    top:
      document
        .getElementById(
          "name-top"
        )
        .value
        .trim(),

    right:
      document
        .getElementById(
          "name-right"
        )
        .value
        .trim(),

    bottom:
      document
        .getElementById(
          "name-bottom"
        )
        .value
        .trim(),

    left:
      document
        .getElementById(
          "name-left"
        )
        .value
        .trim()

  };

}


/* ========================================
   名前確認
======================================== */

function validatePlayers(
  players
) {

  const names =
    Object.values(players);


  if (
    names.some(
      (name) =>
        name === ""
    )
  ) {

    setupError.textContent =
      "4人全員の名前を入力してください。";

    return false;

  }


  if (
    new Set(names).size
    !== 4
  ) {

    setupError.textContent =
      "同じ名前は使用できません。";

    return false;

  }


  setupError.textContent =
    "";


  return true;

}


/* ========================================
   席風
======================================== */

function getSeatWinds() {

  const winds = [
    "東",
    "南",
    "西",
    "北"
  ];


  const dealerIndex =
    positions.indexOf(
      dealerPosition
    );


  const result =
    {};


  positions.forEach(
    (position, index) => {

      const distance =
        (
          index
          - dealerIndex
          + 4
        ) % 4;


      result[position] =
        winds[distance];

    }
  );


  return result;

}


/* ========================================
   初期順位
======================================== */

function getInitialRanks(
  windsByPosition
) {

  const windRank = {

    東: 1,
    南: 2,
    西: 3,
    北: 4

  };


  const ranks =
    {};


  positions.forEach(
    (position) => {

      ranks[position] =
        windRank[
          windsByPosition[
            position
          ]
        ];

    }
  );


  return ranks;

}


/* ========================================
   開始前確認へ
======================================== */

goConfirmButton.addEventListener(
  "click",
  () => {

    const players =
      getPlayers();


    if (
      !validatePlayers(
        players
      )
    ) {

      return;

    }


    currentPlayers =
      players;


    updateConfirmationScreen();


    setupScreen
      .classList
      .remove(
        "active"
      );


    confirmScreen
      .classList
      .add(
        "active"
      );

  }
);


/* ========================================
   確認画面更新
======================================== */

function updateConfirmationScreen() {

  const winds =
    getSeatWinds();


  positions.forEach(
    (position) => {

      document
        .getElementById(
          `confirm-name-${position}`
        )
        .textContent =
        currentPlayers[
          position
        ];


      const panel =
        document.getElementById(
          `confirm-${position}`
        );


      panel
        .querySelector(
          ".confirm-wind"
        )
        .textContent =
        winds[
          position
        ];


      panel
        .classList
        .remove(
          "dealer-highlight"
        );

    }
  );


  document
    .getElementById(
      `confirm-${dealerPosition}`
    )
    .classList
    .add(
      "dealer-highlight"
    );


  document
    .getElementById(
      "confirm-dealer-name"
    )
    .textContent =
    `親：${
      currentPlayers[
        dealerPosition
      ]
    }`;

}


/* ========================================
   設定へ戻る
======================================== */

backSetupButton.addEventListener(
  "click",
  () => {

    confirmScreen
      .classList
      .remove(
        "active"
      );


    setupScreen
      .classList
      .add(
        "active"
      );

  }
);


/* ========================================
   対局開始
======================================== */

startGameButton.addEventListener(
  "click",
  () => {

    const winds =
      getSeatWinds();


    initialRanks =
      getInitialRanks(
        winds
      );


    positions.forEach(
      (position) => {

        gameState.scores[
          position
        ] = 25000;


        gameState.riichi[
          position
        ] = false;


        document
          .getElementById(
            `game-name-${position}`
          )
          .textContent =
          currentPlayers[
            position
          ];


        document
          .getElementById(
            `wind-${position}`
          )
          .textContent =
          winds[
            position
          ];


        document
          .getElementById(
            `panel-${position}`
          )
          .classList
          .remove(
            "dealer"
          );

      }
    );


    gameState.kyotaku =
      0;


    gameState.honba =
      0;


    document
      .getElementById(
        `panel-${dealerPosition}`
      )
      .classList
      .add(
        "dealer"
      );


    document
      .getElementById(
        "dealer-name-display"
      )
      .textContent =
      `親：${
        currentPlayers[
          dealerPosition
        ]
      }`;


    updateGameUI();


    confirmScreen
      .classList
      .remove(
        "active"
      );


    gameScreen
      .classList
      .add(
        "active"
      );

  }
);


/* ========================================
   リーチ
======================================== */

riichiButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      (event) => {

        event.stopPropagation();


        if (
          agariFlow.active
        ) {

          return;

        }


        const position =
          button.dataset.position;


        if (
          gameState.riichi[
            position
          ]
        ) {

          openRiichiCancelModal(
            position
          );

          return;

        }


        activateRiichi(
          position
        );

      }
    );

  }
);


function activateRiichi(
  position
) {

  if (
    gameState.scores[
      position
    ] < 1000
  ) {

    return;

  }


  gameState.scores[
    position
  ] -= 1000;


  gameState.kyotaku +=
    1;


  gameState.riichi[
    position
  ] = true;


  updateGameUI();


  showScoreDelta(
    position,
    -1000
  );


  flashElement(
    document.getElementById(
      `panel-${position}`
    )
  );


  flashElement(
    document.getElementById(
      "kyotaku-display"
    )
  );

}


/* ========================================
   リーチ取消
======================================== */

function openRiichiCancelModal(
  position
) {

  cancellingRiichiPosition =
    position;


  riichiCancelText.textContent =
    `${
      currentPlayers[
        position
      ]
    }さんのリーチを取り消します。`;


  riichiCancelModal
    .classList
    .remove(
      "hidden"
    );

}


riichiCancelBack.addEventListener(
  "click",
  closeRiichiCancelModal
);


riichiCancelConfirm.addEventListener(
  "click",
  () => {

    if (
      cancellingRiichiPosition
      === null
    ) {

      return;

    }


    cancelRiichi(
      cancellingRiichiPosition
    );


    closeRiichiCancelModal();

  }
);


function cancelRiichi(
  position
) {

  gameState.scores[
    position
  ] += 1000;


  gameState.kyotaku =
    Math.max(
      0,
      gameState.kyotaku - 1
    );


  gameState.riichi[
    position
  ] = false;


  updateGameUI();


  showScoreDelta(
    position,
    1000
  );

}


function closeRiichiCancelModal() {

  cancellingRiichiPosition =
    null;


  riichiCancelModal
    .classList
    .add(
      "hidden"
    );

}


/* ========================================
   アガリ開始
======================================== */

agariButton.addEventListener(
  "click",
  openAgariFlow
);


function openAgariFlow() {

  agariFlow.active =
    true;

  agariFlow.step =
    "type";

  agariFlow.type =
    null;

  agariFlow.winners =
    [];

  agariFlow.discarder =
    null;

  agariFlow.addingWinner =
    false;

  agariFlow.currentWinnerIndex =
    0;

  agariFlow.currentScoreSelection =
    null;

  agariFlow.scoreResults =
    {};

  agariFlow.showHighFu =
    false;


  clearWinnerSelection();

  clearDiscarderSelection();


  agariOverlay
    .classList
    .remove(
      "hidden"
    );


  renderAgariFlow();

  updateGameUI();

}


/* ========================================
   アガリ画面切り替え
======================================== */

function renderAgariFlow() {

  if (
    agariFlow.step
    === "type"
  ) {

    renderAgariTypeSelection();

    return;

  }


  if (
    agariFlow.step
    === "winner"
  ) {

    renderWinnerSelection();

    return;

  }


  if (
    agariFlow.step
    === "discarder"
  ) {

    renderDiscarderSelection();

    return;

  }


  if (
    agariFlow.step
    === "score"
  ) {

    renderScoreTable();

    return;

  }


  if (
    agariFlow.step
    === "scoreComplete"
  ) {

    renderScoreComplete();

  }

}


/* ========================================
   ロン / ツモ
======================================== */

function renderAgariTypeSelection() {

  agariFlowTitle.textContent =
    "アガリ方法を選択";


  agariFlowContent.innerHTML = `

    <p class="selection-subtext">
      ロンかツモを選んでください
    </p>

    <div class="agari-type-buttons">

      <button
        id="select-ron-button"
        class="agari-type-button ron-button"
      >
        ロン
      </button>

      <button
        id="select-tsumo-button"
        class="agari-type-button tsumo-button"
      >
        ツモ
      </button>

    </div>
  `;


  document
    .getElementById(
      "select-ron-button"
    )
    .onclick =
    () => {

      startWinnerSelection(
        "ron"
      );

    };


  document
    .getElementById(
      "select-tsumo-button"
    )
    .onclick =
    () => {

      startWinnerSelection(
        "tsumo"
      );

    };

}


/* ========================================
   アガリ者選択
======================================== */

function startWinnerSelection(
  type
) {

  agariFlow.type =
    type;

  agariFlow.step =
    "winner";

  agariFlow.winners =
    [];

  agariFlow.discarder =
    null;

  agariFlow.addingWinner =
    false;


  setPlayerSelectionMode(
    true
  );


  renderAgariFlow();

}


function renderWinnerSelection() {

  const isRon =
    agariFlow.type
    === "ron";


  agariFlowTitle.textContent =
    isRon
      ? "ロンした人を選択"
      : "ツモした人を選択";


  const winnerChips =
    agariFlow.winners.length
      === 0

      ? `
        <span class="selection-subtext">
          まだ選択されていません
        </span>
      `

      : agariFlow.winners
          .map(
            (position) => `

              <span class="winner-chip">

                ${
                  escapeHtml(
                    currentPlayers[
                      position
                    ]
                  )
                }

              </span>
            `
          )
          .join("");


  let addButton =
    "";


  if (
    isRon
    &&
    agariFlow.winners.length
      >= 1
    &&
    agariFlow.winners.length
      < 3
  ) {

    addButton = `

      <button
        id="add-ron-winner-button"
        class="flow-button flow-add"
        ${
          agariFlow.addingWinner
            ? "disabled"
            : ""
        }
      >

        ${
          agariFlow.addingWinner
            ? "追加選択中"
            : "ロン者を追加"
        }

      </button>
    `;

  }


  agariFlowContent.innerHTML = `

    <p class="selection-guide">

      ${
        agariFlow.addingWinner
          ? "追加するロン者を選んでください"
          : "アガった人のパネルをタップしてください"
      }

    </p>


    <div class="selected-winners">

      ${winnerChips}

    </div>


    <p class="selection-subtext">

      ${
        isRon
          ? "最大3人まで選択できます"
          : "ツモ者は1人だけです"
      }

    </p>


    <div class="agari-flow-actions">

      <button
        id="winner-back-button"
        class="flow-button flow-back"
      >
        戻る
      </button>


      ${addButton}


      <button
        id="winner-next-button"
        class="flow-button flow-next"
        ${
          agariFlow.winners.length
            === 0
            ? "disabled"
            : ""
        }
      >
        次へ
      </button>

    </div>
  `;


  document
    .getElementById(
      "winner-back-button"
    )
    .onclick =
    () => {

      setPlayerSelectionMode(
        false
      );


      clearWinnerSelection();


      agariFlow.step =
        "type";

      agariFlow.type =
        null;

      agariFlow.winners =
        [];

      agariFlow.addingWinner =
        false;


      renderAgariFlow();

    };


  const addButtonElement =
    document.getElementById(
      "add-ron-winner-button"
    );


  if (
    addButtonElement
  ) {

    addButtonElement.onclick =
      () => {

        agariFlow.addingWinner =
          true;


        renderAgariFlow();

      };

  }


  document
    .getElementById(
      "winner-next-button"
    )
    .onclick =
    () => {

      if (
        agariFlow.type
        === "ron"
      ) {

        agariFlow.step =
          "discarder";


        agariFlow.discarder =
          null;


        setPlayerSelectionMode(
          true
        );

      } else {

        prepareScoreInput();

      }


      renderAgariFlow();

    };

}


/* ========================================
   プレイヤータップ
======================================== */

playerPanels.forEach(
  (panel) => {

    panel.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            ".riichi-button"
          )
          &&
          !agariFlow.active
        ) {

          return;

        }


        if (
          !agariFlow.active
        ) {

          return;

        }


        const position =
          panel.dataset.position;


        if (
          agariFlow.step
          === "winner"
        ) {

          handleWinnerSelection(
            position
          );

          return;

        }


        if (
          agariFlow.step
          === "discarder"
        ) {

          handleDiscarderSelection(
            position
          );

        }

      }
    );

  }
);


/* ========================================
   アガリ者処理
======================================== */

function handleWinnerSelection(
  position
) {

  const alreadySelected =
    agariFlow.winners.includes(
      position
    );


  if (
    alreadySelected
  ) {

    agariFlow.winners =
      agariFlow.winners.filter(
        (item) =>
          item !== position
      );


    agariFlow.addingWinner =
      false;


    updateWinnerHighlights();

    renderAgariFlow();

    return;

  }


  if (
    agariFlow.type
    === "tsumo"
  ) {

    agariFlow.winners =
      [position];


    updateWinnerHighlights();

    renderAgariFlow();

    return;

  }


  if (
    agariFlow.winners.length
    === 0
  ) {

    agariFlow.winners.push(
      position
    );


    updateWinnerHighlights();

    renderAgariFlow();

    return;

  }


  if (
    agariFlow.addingWinner
    &&
    agariFlow.winners.length
      < 3
  ) {

    agariFlow.winners.push(
      position
    );


    agariFlow.addingWinner =
      false;


    updateWinnerHighlights();

    renderAgariFlow();

    return;

  }


  /*
    通常のロン者選択中に別のプレイヤーをタップした場合は、
    戻る必要なく選択をその人へ切り替える。
    複数ロンにしたい場合だけ「ロン者を追加」を使う。
  */
  agariFlow.winners =
    [position];

  agariFlow.addingWinner =
    false;


  updateWinnerHighlights();

  renderAgariFlow();

}


function updateWinnerHighlights() {

  positions.forEach(
    (position) => {

      document
        .getElementById(
          `panel-${position}`
        )
        .classList
        .toggle(
          "selected-player",
          agariFlow.winners.includes(
            position
          )
        );

    }
  );

}


function clearWinnerSelection() {

  positions.forEach(
    (position) => {

      document
        .getElementById(
          `panel-${position}`
        )
        .classList
        .remove(
          "selected-player"
        );

    }
  );

}


/* ========================================
   放銃者
======================================== */

function renderDiscarderSelection() {

  agariFlowTitle.textContent =
    "放銃者を選択";


  const winnerNames =
    agariFlow.winners
      .map(
        (position) =>
          currentPlayers[
            position
          ]
      )
      .join("・");


  agariFlowContent.innerHTML = `

    <p class="selection-guide">
      放銃した人のパネルをタップしてください
    </p>


    <p class="selection-subtext">

      アガリ：
      ${escapeHtml(winnerNames)}

    </p>


    <div class="selected-winners">

      <span class="winner-chip">

        放銃：

        ${
          agariFlow.discarder

            ? escapeHtml(
                currentPlayers[
                  agariFlow.discarder
                ]
              )

            : "未選択"
        }

      </span>

    </div>


    <div class="agari-flow-actions">

      <button
        id="discarder-back-button"
        class="flow-button flow-back"
      >
        戻る
      </button>


      <button
        id="discarder-next-button"
        class="flow-button flow-next"
        ${
          agariFlow.discarder
            ? ""
            : "disabled"
        }
      >
        次へ
      </button>

    </div>
  `;


  document
    .getElementById(
      "discarder-back-button"
    )
    .onclick =
    () => {

      clearDiscarderSelection();


      agariFlow.discarder =
        null;

      agariFlow.step =
        "winner";


      renderAgariFlow();

    };


  document
    .getElementById(
      "discarder-next-button"
    )
    .onclick =
    () => {

      prepareScoreInput();

      renderAgariFlow();

    };

}


function handleDiscarderSelection(
  position
) {

  if (
    agariFlow.winners.includes(
      position
    )
  ) {

    return;

  }


  if (
    agariFlow.discarder
    === position
  ) {

    agariFlow.discarder =
      null;


    clearDiscarderSelection();


    renderAgariFlow();

    return;

  }


  agariFlow.discarder =
    position;


  clearDiscarderSelection();


  document
    .getElementById(
      `panel-${position}`
    )
    .classList
    .add(
      "discarder-player"
    );


  renderAgariFlow();

}


function clearDiscarderSelection() {

  positions.forEach(
    (position) => {

      document
        .getElementById(
          `panel-${position}`
        )
        .classList
        .remove(
          "discarder-player"
        );

    }
  );

}


/* ========================================
   点数入力準備
======================================== */

function prepareScoreInput() {

  agariFlow.step =
    "score";


  agariFlow.currentWinnerIndex =
    0;


  agariFlow.currentScoreSelection =
    null;


  agariFlow.scoreResults =
    {};


  agariFlow.showHighFu =
    false;


  setPlayerSelectionMode(
    false
  );

}


/* ========================================
   麻雀点数計算
======================================== */

function round100(
  value
) {

  return Math.ceil(
    value / 100
  ) * 100;

}


function calculateBasePoints(
  fu,
  han
) {

  let base =
    fu
    * Math.pow(
        2,
        han + 2
      );


  if (
    base >= 2000
  ) {

    base =
      2000;

  }


  return base;

}


function paymentFromBase(
  base,
  winnerPosition
) {

  const isDealer =
    winnerPosition
    === dealerPosition;


  if (
    agariFlow.type
    === "ron"
  ) {

    return {

      type:
        "ron",

      total:
        round100(
          base
          * (
              isDealer
                ? 6
                : 4
            )
        )

    };

  }


  if (
    isDealer
  ) {

    return {

      type:
        "dealerTsumo",

      all:
        round100(
          base * 2
        )

    };

  }


  return {

    type:
      "childTsumo",

    child:
      round100(
        base
      ),

    dealer:
      round100(
        base * 2
      )

  };

}


/* ========================================
   満貫以上
======================================== */

function getLimitScores() {

  return [

    {
      key:
        "mangan",

      name:
        "満貫",

      base:
        2000
    },

    {
      key:
        "haneman",

      name:
        "跳満",

      base:
        3000
    },

    {
      key:
        "baiman",

      name:
        "倍満",

      base:
        4000
    },

    {
      key:
        "sanbaiman",

      name:
        "三倍満",

      base:
        6000
    },

    {
      key:
        "yakuman",

      name:
        "役満",

      base:
        8000
    }

  ];

}


/* ========================================
   点数文字列
======================================== */

function formatPayment(
  payment
) {

  if (
    payment.type
    === "ron"
  ) {

    return payment.total
      .toLocaleString(
        "ja-JP"
      );

  }


  if (
    payment.type
    === "dealerTsumo"
  ) {

    return `${
      payment.all
        .toLocaleString(
          "ja-JP"
        )
    }オール`;

  }


  return `${
    payment.child
      .toLocaleString(
        "ja-JP"
      )
  }/${
    payment.dealer
      .toLocaleString(
        "ja-JP"
      )
  }`;

}


/* ========================================
   点数表を作る
======================================== */

function buildScoreTable(
  fuList,
  winnerPosition
) {

  const hanList = [
    1,
    2,
    3,
    4
  ];


  const rows =
    fuList
      .map(
        (fu) => {

          const cells =
            hanList
              .map(
                (han) => {

                  const disabled =
                    isImpossibleScore(
                      fu,
                      han
                    );


                  const payment =
                    paymentFromBase(
                      calculateBasePoints(
                        fu,
                        han
                      ),
                      winnerPosition
                    );


                  const selected =
                    agariFlow.currentScoreSelection
                    &&
                    agariFlow
                      .currentScoreSelection
                      .fu
                      === fu
                    &&
                    agariFlow
                      .currentScoreSelection
                      .han
                      === han;


                  return `

                    <td>

                      <button
                        class="
                          score-cell
                          ${
                            selected
                              ? "selected"
                              : ""
                          }
                        "
                        data-fu="${fu}"
                        data-han="${han}"
                        ${
                          disabled
                            ? "disabled"
                            : ""
                        }
                      >

                        ${
                          formatPayment(
                            payment
                          )
                        }

                      </button>

                    </td>
                  `;

                }
              )
              .join("");


          return `

            <tr>

              <th>
                ${fu}符
              </th>

              ${cells}

            </tr>
          `;

        }
      )
      .join("");


  return `

    <table>

      <thead>

        <tr>

          <th>
            符
          </th>

          <th>
            1翻
          </th>

          <th>
            2翻
          </th>

          <th>
            3翻
          </th>

          <th>
            4翻
          </th>

        </tr>

      </thead>


      <tbody>

        ${rows}

      </tbody>

    </table>
  `;

}


/* ========================================
   点数表表示
======================================== */

function renderScoreTable() {

  const winnerPosition =
    agariFlow.winners[
      agariFlow.currentWinnerIndex
    ];


  const winnerName =
    currentPlayers[
      winnerPosition
    ];


  const isDealer =
    winnerPosition
    === dealerPosition;


  const visibleFuList =
    agariFlow.showHighFu

      ? highFuList

      : normalFuList;


  const scoreTable =
    buildScoreTable(
      visibleFuList,
      winnerPosition
    );


  const limitButtons =
    getLimitScores()
      .map(
        (item) => {

          const payment =
            paymentFromBase(
              item.base,
              winnerPosition
            );


          const selected =
            agariFlow.currentScoreSelection
            &&
            agariFlow
              .currentScoreSelection
              .limitKey
              === item.key;


          return `

            <button
              class="
                limit-button
                ${
                  selected
                    ? "selected"
                    : ""
                }
              "
              data-limit="${item.key}"
            >

              ${item.name}

              <span>

                ${
                  formatPayment(
                    payment
                  )
                }

              </span>

            </button>
          `;

        }
      )
      .join("");


  const summary =
    getCurrentScoreSummary();


  agariFlowTitle.textContent =
    "点数入力";


  agariFlowContent.innerHTML = `

    <div class="score-input-header">

      <strong>

        ${
          escapeHtml(
            winnerName
          )
        }

        ${
          isDealer
            ? "（親）"
            : "（子）"
        }

      </strong>


      <span class="score-progress">

        ${
          agariFlow.currentWinnerIndex
          + 1
        }/${
          agariFlow.winners.length
        }人目

      </span>

    </div>


    <div class="score-selected-summary">

      ${
        summary

          ? escapeHtml(
              summary
            )

          : "符・翻を選択してください"
      }

    </div>


    <div class="score-switch-table">

      ${scoreTable}

    </div>


    <div class="fu-switch-area">

      <button
        id="fu-switch-button"
        class="fu-switch-button"
      >

        ${
          agariFlow.showHighFu

            ? "20〜50符に戻す"

            : "60〜110符を表示"
        }

      </button>

    </div>


    <div class="limit-title">
      5翻以上
    </div>


    <div class="limit-grid">

      ${limitButtons}

    </div>


    <div class="agari-flow-actions">

      <button
        id="score-back-button"
        class="flow-button flow-back"
      >
        戻る
      </button>


      <button
        id="direct-score-button"
        class="flow-button flow-add"
      >
        点数を直接入力
      </button>


      <button
        id="score-next-button"
        class="flow-button flow-next"
        ${
          agariFlow.currentScoreSelection
            ? ""
            : "disabled"
        }
      >
        次へ
      </button>

    </div>
  `;


  document
    .querySelectorAll(
      ".score-cell"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            const fu =
              Number(
                button.dataset.fu
              );


            const han =
              Number(
                button.dataset.han
              );


            const base =
              calculateBasePoints(
                fu,
                han
              );


            const payment =
              paymentFromBase(
                base,
                winnerPosition
              );


            agariFlow
              .currentScoreSelection =
              {

                source:
                  "table",

                fu,

                han,

                payment,

                summary:
                  `${fu}符${han}翻 / ${
                    formatPayment(
                      payment
                    )
                  }点`

              };


            renderScoreTable();

          };

      }
    );


  document
    .querySelectorAll(
      ".limit-button"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            const item =
              getLimitScores()
                .find(
                  (limit) =>
                    limit.key
                    ===
                    button.dataset.limit
                );


            const payment =
              paymentFromBase(
                item.base,
                winnerPosition
              );


            agariFlow
              .currentScoreSelection =
              {

                source:
                  "limit",

                limitKey:
                  item.key,

                limitName:
                  item.name,

                payment,

                summary:
                  `${item.name} / ${
                    formatPayment(
                      payment
                    )
                  }点`

              };


            renderScoreTable();

          };

      }
    );


  document
    .getElementById(
      "fu-switch-button"
    )
    .onclick =
    () => {

      agariFlow.showHighFu =
        !agariFlow.showHighFu;


      renderScoreTable();

    };


  document
    .getElementById(
      "score-back-button"
    )
    .onclick =
    goBackFromScore;


  document
    .getElementById(
      "direct-score-button"
    )
    .onclick =
    renderDirectScoreInput;


  document
    .getElementById(
      "score-next-button"
    )
    .onclick =
    saveCurrentWinnerScore;

}


/* ========================================
   ありえないマス
======================================== */

function isImpossibleScore(
  fu,
  han
) {

  if (
    agariFlow.type
      === "ron"
    &&
    fu === 20
  ) {

    return true;

  }


  if (
    fu === 25
    &&
    han === 1
  ) {

    return true;

  }


  if (
    agariFlow.type
      === "tsumo"
    &&
    fu === 20
    &&
    han === 1
  ) {

    return true;

  }


  return false;

}


/* ========================================
   選択内容
======================================== */

function getCurrentScoreSummary() {

  if (
    !agariFlow
      .currentScoreSelection
  ) {

    return null;

  }


  return agariFlow
    .currentScoreSelection
    .summary;

}


/* ========================================
   直接点数入力
======================================== */

function renderDirectScoreInput() {

  const winnerPosition =
    agariFlow.winners[
      agariFlow.currentWinnerIndex
    ];


  const winnerName =
    currentPlayers[
      winnerPosition
    ];


  const isDealer =
    winnerPosition
    === dealerPosition;


  let fields =
    "";


  if (
    agariFlow.type
    === "ron"
  ) {

    fields = `

      <div class="direct-score-field">

        <label>
          ロン点数
        </label>

        <input
          id="direct-ron"
          type="number"
          inputmode="numeric"
          step="100"
          placeholder="例：3900"
        >

      </div>
    `;

  } else if (
    isDealer
  ) {

    fields = `

      <div class="direct-score-field">

        <label>
          1人あたりの支払い
        </label>

        <input
          id="direct-all"
          type="number"
          inputmode="numeric"
          step="100"
          placeholder="例：2000"
        >

      </div>
    `;

  } else {

    fields = `

      <div class="direct-score-field">

        <label>
          子1人あたりの支払い
        </label>

        <input
          id="direct-child"
          type="number"
          inputmode="numeric"
          step="100"
          placeholder="例：1000"
        >

      </div>


      <div class="direct-score-field">

        <label>
          親の支払い
        </label>

        <input
          id="direct-dealer"
          type="number"
          inputmode="numeric"
          step="100"
          placeholder="例：2000"
        >

      </div>
    `;

  }


  agariFlowTitle.textContent =
    "点数を直接入力";


  agariFlowContent.innerHTML = `

    <div class="score-input-header">

      <strong>

        ${
          escapeHtml(
            winnerName
          )
        }

        ${
          isDealer
            ? "（親）"
            : "（子）"
        }

      </strong>


      <span class="score-progress">

        ${
          agariFlow.currentWinnerIndex
          + 1
        }/${
          agariFlow.winners.length
        }人目

      </span>

    </div>


    <div class="direct-score-area">

      <p class="direct-score-description">

        本場・供託を含めない
        基本点数を入力します

      </p>


      <div class="direct-score-fields">

        ${fields}

      </div>


      <p
        id="direct-score-error"
        class="score-error"
      ></p>

    </div>


    <div class="agari-flow-actions">

      <button
        id="direct-back-button"
        class="flow-button flow-back"
      >
        点数表に戻る
      </button>


      <button
        id="direct-next-button"
        class="flow-button flow-next"
      >
        次へ
      </button>

    </div>
  `;


  document
    .getElementById(
      "direct-back-button"
    )
    .onclick =
    renderScoreTable;


  document
    .getElementById(
      "direct-next-button"
    )
    .onclick =
    saveDirectScore;

}


/* ========================================
   直接入力保存
======================================== */

function saveDirectScore() {

  const winnerPosition =
    agariFlow.winners[
      agariFlow.currentWinnerIndex
    ];


  const isDealer =
    winnerPosition
    === dealerPosition;


  const errorElement =
    document.getElementById(
      "direct-score-error"
    );


  let selection =
    null;


  if (
    agariFlow.type
    === "ron"
  ) {

    const value =
      Number(
        document
          .getElementById(
            "direct-ron"
          )
          .value
      );


    if (
      !isValidManualPoint(
        value
      )
    ) {

      errorElement.textContent =
        "100点単位の点数を入力してください。";

      return;

    }


    selection = {

      source:
        "direct",

      payment: {

        type:
          "ron",

        total:
          value

      },

      summary:
        `直接入力 / ${
          value.toLocaleString(
            "ja-JP"
          )
        }点`

    };

  } else if (
    isDealer
  ) {

    const value =
      Number(
        document
          .getElementById(
            "direct-all"
          )
          .value
      );


    if (
      !isValidManualPoint(
        value
      )
    ) {

      errorElement.textContent =
        "100点単位の点数を入力してください。";

      return;

    }


    selection = {

      source:
        "direct",

      payment: {

        type:
          "dealerTsumo",

        all:
          value

      },

      summary:
        `直接入力 / ${
          value.toLocaleString(
            "ja-JP"
          )
        }オール`

    };

  } else {

    const child =
      Number(
        document
          .getElementById(
            "direct-child"
          )
          .value
      );


    const dealer =
      Number(
        document
          .getElementById(
            "direct-dealer"
          )
          .value
      );


    if (
      !isValidManualPoint(
        child
      )
      ||
      !isValidManualPoint(
        dealer
      )
    ) {

      errorElement.textContent =
        "両方とも100点単位で入力してください。";

      return;

    }


    selection = {

      source:
        "direct",

      payment: {

        type:
          "childTsumo",

        child,

        dealer

      },

      summary:
        `直接入力 / ${
          child.toLocaleString(
            "ja-JP"
          )
        }/${
          dealer.toLocaleString(
            "ja-JP"
          )
        }点`

    };

  }


  agariFlow
    .currentScoreSelection =
    selection;


  saveCurrentWinnerScore();

}


function isValidManualPoint(
  value
) {

  return (
    Number.isInteger(
      value
    )
    &&
    value > 0
    &&
    value % 100
      === 0
  );

}


/* ========================================
   点数保存
======================================== */

function saveCurrentWinnerScore() {

  if (
    !agariFlow
      .currentScoreSelection
  ) {

    return;

  }


  const winnerPosition =
    agariFlow.winners[
      agariFlow.currentWinnerIndex
    ];


  agariFlow.scoreResults[
    winnerPosition
  ] =
    agariFlow.currentScoreSelection;


  if (
    agariFlow.currentWinnerIndex
    <
    agariFlow.winners.length
      - 1
  ) {

    agariFlow.currentWinnerIndex +=
      1;


    const nextWinner =
      agariFlow.winners[
        agariFlow.currentWinnerIndex
      ];


    agariFlow
      .currentScoreSelection =
      agariFlow.scoreResults[
        nextWinner
      ]
      || null;


    /*
      次のロン者へ進んだら
      普通の20〜60符表示に戻す
    */

    agariFlow.showHighFu =
      false;


    renderScoreTable();

    return;

  }


  agariFlow.step =
    "scoreComplete";


  agariFlow.currentScoreSelection =
    null;


  renderAgariFlow();

}


/* ========================================
   点数入力から戻る
======================================== */

function goBackFromScore() {

  if (
    agariFlow.currentWinnerIndex
    > 0
  ) {

    agariFlow.currentWinnerIndex -=
      1;


    const previousWinner =
      agariFlow.winners[
        agariFlow.currentWinnerIndex
      ];


    agariFlow
      .currentScoreSelection =
      agariFlow.scoreResults[
        previousWinner
      ]
      || null;


    agariFlow.showHighFu =
      false;


    renderScoreTable();

    return;

  }


  agariFlow
    .currentScoreSelection =
    null;


  agariFlow.showHighFu =
    false;


  if (
    agariFlow.type
    === "ron"
  ) {

    agariFlow.step =
      "discarder";


    setPlayerSelectionMode(
      true
    );

  } else {

    agariFlow.step =
      "winner";


    setPlayerSelectionMode(
      true
    );

  }


  renderAgariFlow();

}


/* ========================================
   点数入力完了
======================================== */

function renderScoreComplete() {

  agariFlowTitle.textContent =
    "点数入力完了";


  const rows =
    agariFlow.winners
      .map(
        (position) => {

          const result =
            agariFlow.scoreResults[
              position
            ];


          return `

            <div class="score-result-row">

              <strong>

                ${
                  escapeHtml(
                    currentPlayers[
                      position
                    ]
                  )
                }

              </strong>


              <span>

                ${
                  escapeHtml(
                    result.summary
                  )
                }

              </span>

            </div>
          `;

        }
      )
      .join("");


  agariFlowContent.innerHTML = `

    <div class="score-result-list">

      ${rows}

    </div>


    <p class="selection-subtext">

      本場・供託は
      まだ加算していません

    </p>


    <div class="agari-flow-actions">

      <button
        id="score-complete-back"
        class="flow-button flow-back"
      >
        修正する
      </button>


      <button
        id="score-complete-next"
        class="flow-button flow-next"
      >
        次へ
      </button>

    </div>
  `;


  document
    .getElementById(
      "score-complete-back"
    )
    .onclick =
    () => {

      agariFlow.currentWinnerIndex =
        agariFlow.winners.length
        - 1;


      const winner =
        agariFlow.winners[
          agariFlow.currentWinnerIndex
        ];


      agariFlow
        .currentScoreSelection =
        agariFlow.scoreResults[
          winner
        ];


      agariFlow.showHighFu =
        false;


      agariFlow.step =
        "score";


      renderAgariFlow();

    };


  document
    .getElementById(
      "score-complete-next"
    )
    .onclick =
    () => {

      agariFlowTitle.textContent =
        "点数移動";


      agariFlowContent.innerHTML = `

        <div class="flow-placeholder">

          <strong>
            点数入力OK
          </strong>

          <p>
            次は本場・供託を含めた
            実際の点数移動を作ります
          </p>

        </div>
      `;

    };

}


/* ========================================
   選択モード
======================================== */

function setPlayerSelectionMode(
  enabled
) {

  playerPanels.forEach(
    (panel) => {

      panel.classList.toggle(
        "selection-enabled",
        enabled
      );

    }
  );

}


/* ========================================
   キャンセル
======================================== */

agariCancelButton.addEventListener(
  "click",
  () => {

    const result =
      window.confirm(
        "入力内容を破棄しますか？"
      );


    if (
      result
    ) {

      closeAgariFlow();

    }

  }
);


function closeAgariFlow() {

  agariFlow.active =
    false;

  agariFlow.step =
    null;

  agariFlow.type =
    null;

  agariFlow.winners =
    [];

  agariFlow.discarder =
    null;

  agariFlow.addingWinner =
    false;

  agariFlow.currentWinnerIndex =
    0;

  agariFlow.currentScoreSelection =
    null;

  agariFlow.scoreResults =
    {};

  agariFlow.showHighFu =
    false;


  setPlayerSelectionMode(
    false
  );


  clearWinnerSelection();

  clearDiscarderSelection();


  agariOverlay
    .classList
    .add(
      "hidden"
    );


  updateGameUI();

}


/* ========================================
   メインUI
======================================== */

function updateGameUI() {

  updateScores();

  updateRanks();

  updateRiichiButtons();

  updateKyotaku();

  updateMainActionButtons();

}


function updateScores() {

  positions.forEach(
    (position) => {

      document
        .getElementById(
          `score-${position}`
        )
        .textContent =
        gameState.scores[
          position
        ]
        .toLocaleString(
          "ja-JP"
        );

    }
  );

}


function updateRanks() {

  const sorted =
    [...positions]
      .sort(
        (a, b) => {

          const difference =
            gameState.scores[b]
            - gameState.scores[a];


          if (
            difference
            !== 0
          ) {

            return difference;

          }


          return (
            initialRanks[a]
            - initialRanks[b]
          );

        }
      );


  sorted.forEach(
    (position, index) => {

      const rank =
        index + 1;


      const element =
        document.getElementById(
          `rank-${position}`
        );


      element.textContent =
        `${rank}位`;


      element.classList.toggle(
        "rank-1",
        rank === 1
      );

    }
  );

}


function updateRiichiButtons() {

  riichiButtons.forEach(
    (button) => {

      const position =
        button.dataset.position;


      const active =
        gameState.riichi[
          position
        ];


      button.classList.toggle(
        "active",
        active
      );


      button.textContent =
        active
          ? "リーチ中"
          : "リーチ";


      if (
        agariFlow.active
      ) {

        button.disabled =
          true;

      } else if (
        active
      ) {

        button.disabled =
          false;

      } else {

        button.disabled =
          gameState.scores[
            position
          ] < 1000;

      }

    }
  );

}


function updateKyotaku() {

  document
    .getElementById(
      "kyotaku-display"
    )
    .textContent =
    `供託 ${
      gameState.kyotaku
    }`;

}


function updateMainActionButtons() {

  agariButton.disabled =
    agariFlow.active;


  ryukyokuButton.disabled =
    agariFlow.active;

}


/* ========================================
   点数アニメーション
======================================== */

function showScoreDelta(
  position,
  amount
) {

  const element =
    document.getElementById(
      `delta-${position}`
    );


  element.textContent =
    amount > 0

      ? `+${
          amount.toLocaleString(
            "ja-JP"
          )
        }`

      : amount.toLocaleString(
          "ja-JP"
        );


  element
    .classList
    .remove(
      "show"
    );


  void element.offsetWidth;


  element
    .classList
    .add(
      "show"
    );

}


function flashElement(
  element
) {

  element
    .classList
    .remove(
      "flash-highlight"
    );


  void element.offsetWidth;


  element
    .classList
    .add(
      "flash-highlight"
    );


  setTimeout(
    () => {

      element
        .classList
        .remove(
          "flash-highlight"
        );

    },
    700
  );

}


/* ========================================
   HTML安全化
======================================== */

function escapeHtml(
  text
) {

  return String(text)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      "\"",
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}
/* ========================================
   点数入力完了画面 Ver.2
======================================== */

function renderScoreComplete() {

  agariFlowTitle.textContent =
    "点数入力完了";


  const rows =
    agariFlow.winners
      .map(
        (position) => {

          const result =
            agariFlow.scoreResults[
              position
            ];


          return `

            <div class="score-result-row">

              <strong>

                ${
                  escapeHtml(
                    currentPlayers[
                      position
                    ]
                  )
                }

              </strong>


              <span>

                ${
                  escapeHtml(
                    result.summary
                  )
                }

              </span>

            </div>
          `;

        }
      )
      .join("");


  agariFlowContent.innerHTML = `

    <div class="score-result-list">

      ${rows}

    </div>


    <p class="selection-subtext">

      ここから本場・供託を含めた
      実際の点数移動を計算します

    </p>


    <div class="agari-flow-actions">

      <button
        id="score-complete-back"
        class="flow-button flow-back"
      >
        修正する
      </button>


      <button
        id="score-complete-next"
        class="flow-button flow-next"
      >
        点数移動を確認
      </button>

    </div>
  `;


  document
    .getElementById(
      "score-complete-back"
    )
    .onclick =
    () => {

      agariFlow.currentWinnerIndex =
        agariFlow.winners.length
        - 1;


      const winner =
        agariFlow.winners[
          agariFlow.currentWinnerIndex
        ];


      agariFlow
        .currentScoreSelection =
        agariFlow.scoreResults[
          winner
        ];


      agariFlow.showHighFu =
        false;


      agariFlow.step =
        "score";


      renderAgariFlow();

    };


  document
    .getElementById(
      "score-complete-next"
    )
    .onclick =
    () => {

      renderPointMovementPreview();

    };

}


/* ========================================
   ダブロン・トリロン時
   本場・供託を受け取る人
======================================== */

function getHeadWinnerForRon() {

  /*
    放銃者の次のツモ順に
    最も近いロン者を探す
  */

  const discarderIndex =
    positions.indexOf(
      agariFlow.discarder
    );


  let bestWinner =
    null;


  let bestDistance =
    99;


  agariFlow.winners.forEach(
    (winner) => {

      const winnerIndex =
        positions.indexOf(
          winner
        );


      const distance =
        (
          winnerIndex
          - discarderIndex
          + 4
        ) % 4;


      if (
        distance > 0
        &&
        distance < bestDistance
      ) {

        bestDistance =
          distance;


        bestWinner =
          winner;

      }

    }
  );


  return bestWinner;

}


/* ========================================
   点数移動計算
======================================== */

function calculateAgariMovement() {

  const deltas = {

    top: 0,
    right: 0,
    bottom: 0,
    left: 0

  };


  let bonusWinner =
    null;


  /*
    ロン
  */

  if (
    agariFlow.type
    === "ron"
  ) {

    agariFlow.winners.forEach(
      (winner) => {

        const result =
          agariFlow.scoreResults[
            winner
          ];


        const ronPoints =
          result.payment.total;


        deltas[winner] +=
          ronPoints;


        deltas[
          agariFlow.discarder
        ] -=
          ronPoints;

      }
    );


    /*
      本場・供託は
      上家取り
    */

    bonusWinner =
      getHeadWinnerForRon();


    const honbaBonus =
      gameState.honba
      * 300;


    const kyotakuBonus =
      gameState.kyotaku
      * 1000;


    if (
      bonusWinner
    ) {

      deltas[
        bonusWinner
      ] +=
        honbaBonus
        + kyotakuBonus;


      deltas[
        agariFlow.discarder
      ] -=
        honbaBonus;

    }

  }


  /*
    ツモ
  */

  if (
    agariFlow.type
    === "tsumo"
  ) {

    const winner =
      agariFlow.winners[0];


    const result =
      agariFlow.scoreResults[
        winner
      ];


    const payment =
      result.payment;


    bonusWinner =
      winner;


    positions.forEach(
      (payer) => {

        if (
          payer === winner
        ) {

          return;

        }


        let paymentAmount =
          0;


        /*
          親ツモ
        */

        if (
          payment.type
          === "dealerTsumo"
        ) {

          paymentAmount =
            payment.all;

        }


        /*
          子ツモ
        */

        if (
          payment.type
          === "childTsumo"
        ) {

          if (
            payer
            === dealerPosition
          ) {

            paymentAmount =
              payment.dealer;

          } else {

            paymentAmount =
              payment.child;

          }

        }


        /*
          本場は
          各自100点 × 本場
        */

        paymentAmount +=
          gameState.honba
          * 100;


        deltas[payer] -=
          paymentAmount;


        deltas[winner] +=
          paymentAmount;

      }
    );


    /*
      供託は勝者へ
    */

    deltas[winner] +=
      gameState.kyotaku
      * 1000;

  }


  return {

    deltas,

    bonusWinner

  };

}


/* ========================================
   点数移動確認
======================================== */

function renderPointMovementPreview() {

  const movement =
    calculateAgariMovement();


  agariFlow.pendingMovement =
    movement;


  agariFlowTitle.textContent =
    "点数移動の確認";


  const rows =
    positions
      .map(
        (position) => {

          const delta =
            movement.deltas[
              position
            ];


          const afterScore =
            gameState.scores[
              position
            ]
            + delta;


          let deltaText =
            "±0";


          if (
            delta > 0
          ) {

            deltaText =
              `+${
                delta.toLocaleString(
                  "ja-JP"
                )
              }`;

          }


          if (
            delta < 0
          ) {

            deltaText =
              delta.toLocaleString(
                "ja-JP"
              );

          }


          const deltaClass =
            delta > 0

              ? "plus"

              : delta < 0

                ? "minus"

                : "";


          return `

            <div class="movement-row">

              <span class="movement-name">

                ${
                  escapeHtml(
                    currentPlayers[
                      position
                    ]
                  )
                }

              </span>


              <span
                class="
                  movement-delta
                  ${deltaClass}
                "
              >

                ${deltaText}

              </span>


              <span class="movement-after">

                ${
                  afterScore
                    .toLocaleString(
                      "ja-JP"
                    )
                }点

              </span>

            </div>
          `;

        }
      )
      .join("");


  let bonusText =
    "";


  /*
    ロン
  */

  if (
    agariFlow.type
    === "ron"
  ) {

    const bonusWinner =
      movement.bonusWinner;


    if (
      gameState.honba > 0
      ||
      gameState.kyotaku > 0
    ) {

      bonusText = `

        <div class="movement-bonus">

          本場 ${
            gameState.honba
          }本
          （+${
            (
              gameState.honba
              * 300
            )
            .toLocaleString(
              "ja-JP"
            )
          }）

          ・

          供託 ${
            gameState.kyotaku
          }本
          （+${
            (
              gameState.kyotaku
              * 1000
            )
            .toLocaleString(
              "ja-JP"
            )
          }）

          →

          ${
            escapeHtml(
              currentPlayers[
                bonusWinner
              ]
            )
          }

        </div>
      `;

    }

  }


  /*
    ツモ
  */

  if (
    agariFlow.type
      === "tsumo"
    &&
    (
      gameState.honba > 0
      ||
      gameState.kyotaku > 0
    )
  ) {

    bonusText = `

      <div class="movement-bonus">

        本場 ${
          gameState.honba
        }本：

        各支払い
        +${
          (
            gameState.honba
            * 100
          )
          .toLocaleString(
            "ja-JP"
          )
        }

        ／

        供託
        +${
          (
            gameState.kyotaku
            * 1000
          )
          .toLocaleString(
            "ja-JP"
          )
        }

      </div>
    `;

  }


  agariFlowContent.innerHTML = `

    <div class="movement-summary">

      ${rows}

    </div>


    ${bonusText}


    <p class="movement-warning">

      「確定」を押すまで
      持ち点は変更されません

    </p>


    <div class="agari-flow-actions">

      <button
        id="movement-back-button"
        class="flow-button flow-back"
      >
        戻る
      </button>


      <button
        id="movement-confirm-button"
        class="flow-button flow-next"
      >
        確定
      </button>

    </div>
  `;


  document
    .getElementById(
      "movement-back-button"
    )
    .onclick =
    () => {

      agariFlow.step =
        "scoreComplete";


      renderAgariFlow();

    };


  document
    .getElementById(
      "movement-confirm-button"
    )
    .onclick =
    confirmPointMovement;

}


/* ========================================
   点数移動を確定
======================================== */

function confirmPointMovement() {

  const movement =
    agariFlow.pendingMovement;


  if (
    !movement
  ) {

    return;

  }


  positions.forEach(
    (position) => {

      gameState.scores[
        position
      ] +=
        movement.deltas[
          position
        ];

    }
  );


  /*
    供託はアガリで回収
  */

  gameState.kyotaku =
    0;


  /*
    局が終わったので
    リーチ状態を解除
  */

  positions.forEach(
    (position) => {

      gameState.riichi[
        position
      ] = false;

    }
  );


  updateGameUI();


  /*
    各パネルへ増減表示
  */

  positions.forEach(
    (position) => {

      const delta =
        movement.deltas[
          position
        ];


      if (
        delta !== 0
      ) {

        showScoreDelta(
          position,
          delta
        );

      }

  });


  agariFlow.committed =
    true;


  renderAppliedAgariResult();

}


/* ========================================
   点数反映後
======================================== */

function renderAppliedAgariResult() {

  agariFlowTitle.textContent =
    "点数を反映しました";


  const winnerNames =
    agariFlow.winners
      .map(
        (position) =>
          currentPlayers[
            position
          ]
      )
      .join("・");


  agariFlowContent.innerHTML = `

    <div class="applied-result">

      <strong>

        ${
          agariFlow.type
            === "ron"
            ? "ロン"
            : "ツモ"
        }

        ・

        ${
          escapeHtml(
            winnerNames
          )
        }

      </strong>


      <p>

        持ち点・順位・供託を
        更新しました

      </p>

    </div>


    <div class="next-round-placeholder">

      次は
      「親連荘 / 親交代」
      を判定して、

      東1局 → 東2局などの
      局進行を実装します

    </div>
  `;


  /*
    確定後にキャンセルで
    入力だけ消す事故を防ぐ
  */

  agariCancelButton.style.display =
    "none";

}


/* ========================================
   確定後キャンセル防止
======================================== */

agariCancelButton.addEventListener(
  "click",
  (event) => {

    if (
      agariFlow.committed
    ) {

      event.preventDefault();

      event.stopImmediatePropagation();

    }

  },
  true
);
function getLimitHandName(isDealer, han, fu, pointValue, winType) {
  // pointValue はロンなら total、ツモなら親ツモは all、子ツモは total 扱いでOK

  // 役満以上は今回ここでは扱わない
  // 5翻以上は別ボタン行がある前提

  if (isDealer) {
    // 親ロン基準
    if (
      (han === 4 && fu >= 40) ||
      (han === 3 && fu >= 70)
    ) {
      return "満貫";
    }
  } else {
    // 子ロン基準
    if (
      (han === 4 && fu >= 40) ||
      (han === 3 && fu >= 70)
    ) {
      return "満貫";
    }
  }

  return null;
}


function formatScoreButtonLabel({
  isDealer,
  han,
  fu,
  pointValue
}) {
  const limitName = getLimitHandName(
    isDealer,
    han,
    fu,
    pointValue
  );

  if (limitName) {
    return `
      <span class="score-cell-main">${limitName}</span>
      <span class="score-cell-sub">(${pointValue.toLocaleString("ja-JP")})</span>
    `;
  }

  return `
    <span class="score-cell-main">${pointValue.toLocaleString("ja-JP")}</span>
  `;
}
/* ========================================
   符×翻表 Ver.2
   満貫になるマスを名称付きで表示
======================================== */


/*
  1〜4翻の点数表で
  満貫になる条件

  4翻：40符以上
  3翻：70符以上

  30符4翻・60符3翻などは
  満貫ではないので通常表示。
*/

function isManganTableCell(
  fu,
  han
) {

  if (
    han === 4
    &&
    fu >= 40
  ) {

    return true;

  }


  if (
    han === 3
    &&
    fu >= 70
  ) {

    return true;

  }


  return false;

}


/*
  点数表セルの表示を作る

  ロン・ツモ、
  親・子に関係なく、

  満貫なら

  満貫
  8,000

  満貫
  2,000/4,000

  などと表示する。
*/

function buildScoreCellContent(
  fu,
  han,
  payment
) {

  const paymentText =
    formatPayment(
      payment
    );


  if (
    isManganTableCell(
      fu,
      han
    )
  ) {

    return `

      <span class="score-limit-name">
        満貫
      </span>

      <span class="score-limit-payment">
        ${paymentText}
      </span>
    `;

  }


  return paymentText;

}


/* ========================================
   点数表を作る Ver.2
======================================== */

function buildScoreTable(
  fuList,
  winnerPosition
) {

  const hanList = [
    1,
    2,
    3,
    4
  ];


  const rows =
    fuList
      .map(
        (fu) => {

          const cells =
            hanList
              .map(
                (han) => {

                  const disabled =
                    isImpossibleScore(
                      fu,
                      han
                    );


                  const payment =
                    paymentFromBase(
                      calculateBasePoints(
                        fu,
                        han
                      ),
                      winnerPosition
                    );


                  const selected =
                    agariFlow.currentScoreSelection
                    &&
                    agariFlow
                      .currentScoreSelection
                      .fu === fu
                    &&
                    agariFlow
                      .currentScoreSelection
                      .han === han;


                  const isMangan =
                    isManganTableCell(
                      fu,
                      han
                    );


                  return `

                    <td>

                      <button
                        class="
                          score-cell
                          ${
                            selected
                              ? "selected"
                              : ""
                          }
                          ${
                            isMangan
                              ? "limit-score-cell"
                              : ""
                          }
                        "
                        data-fu="${fu}"
                        data-han="${han}"
                        ${
                          disabled
                            ? "disabled"
                            : ""
                        }
                      >

                        ${
                          buildScoreCellContent(
                            fu,
                            han,
                            payment
                          )
                        }

                      </button>

                    </td>
                  `;

                }
              )
              .join("");


          return `

            <tr>

              <th>
                ${fu}符
              </th>

              ${cells}

            </tr>
          `;

        }
      )
      .join("");


  return `

    <table>

      <thead>

        <tr>

          <th>
            符
          </th>

          <th>
            1翻
          </th>

          <th>
            2翻
          </th>

          <th>
            3翻
          </th>

          <th>
            4翻
          </th>

        </tr>

      </thead>


      <tbody>

        ${rows}

      </tbody>

    </table>
  `;

}
/* ========================================
   局進行 Ver.1
======================================== */


/*
  現在の局を対局状態に追加。

  既存gameStateを壊さず、
  あとから項目を追加している。
*/

gameState.roundWind =
  "東";

gameState.handNumber =
  1;


/* ========================================
   新しい対局を始めた時
======================================== */

startGameButton.addEventListener(
  "click",
  () => {

    gameState.roundWind =
      "東";

    gameState.handNumber =
      1;

    gameState.honba =
      0;


    updateRoundDisplay();

  }
);


/* ========================================
   局表示
======================================== */

function getRoundName() {

  return `${
    gameState.roundWind
  }${
    gameState.handNumber
  }局`;

}


function updateRoundDisplay() {

  const roundElement =
    document.querySelector(
      ".round-info strong"
    );


  if (
    roundElement
  ) {

    roundElement.textContent =
      getRoundName();

  }


  document
    .getElementById(
      "honba-display"
    )
    .textContent =
    `${
      gameState.honba
    }本場`;


  document
    .getElementById(
      "dealer-name-display"
    )
    .textContent =
    `親：${
      currentPlayers[
        dealerPosition
      ]
    }`;

}


/* ========================================
   半荘終了判定・次局計算 Ver.3
======================================== */

const MAHJONGSOUL_TARGET_SCORE_V3 =
  30000;


function hasTobiPlayerV3() {

  return positions.some(
    (position) =>
      gameState.scores[
        position
      ] < 0
  );

}


function getTopPositionV3() {

  return getFinalRankingV1()[0];

}


function getTopScoreV3() {

  return gameState.scores[
    getTopPositionV3()
  ];

}


function isDealerTopAtTargetV3() {

  return (
    getTopPositionV3()
      === dealerPosition
    &&
    gameState.scores[
      dealerPosition
    ] >=
      MAHJONGSOUL_TARGET_SCORE_V3
  );

}


function getAgariEndDecisionV3() {

  if (
    hasTobiPlayerV3()
  ) {

    return {
      end: true,
      reason: "トビ終了"
    };

  }


  const dealerWon =
    agariFlow.winners.includes(
      dealerPosition
    );


  const topScore =
    getTopScoreV3();


  if (
    gameState.roundWind === "南"
    &&
    gameState.handNumber === 4
  ) {

    if (
      dealerWon
    ) {

      return isDealerTopAtTargetV3()
        ? {
            end: true,
            reason: "オーラス終了"
          }
        : {
            end: false
          };

    }


    return topScore >=
      MAHJONGSOUL_TARGET_SCORE_V3
      ? {
          end: true,
          reason: "オーラス終了"
        }
      : {
          end: false
        };

  }


  if (
    gameState.roundWind === "西"
  ) {

    if (
      dealerWon
    ) {

      return isDealerTopAtTargetV3()
        ? {
            end: true,
            reason: "延長戦終了"
          }
        : {
            end: false
          };

    }


    if (
      topScore >=
        MAHJONGSOUL_TARGET_SCORE_V3
    ) {

      return {
        end: true,
        reason: "延長戦終了"
      };

    }


    if (
      gameState.handNumber === 4
    ) {

      return {
        end: true,
        reason: "西4局終了"
      };

    }

  }


  return {
    end: false
  };

}


function getRyuukyokuEndDecisionV3() {

  if (
    hasTobiPlayerV3()
  ) {

    return {
      end: true,
      reason: "トビ終了"
    };

  }


  const dealerTenpai =
    ryuukyokuFlowV1
      .dealerTenpai;


  const topScore =
    getTopScoreV3();


  if (
    gameState.roundWind === "南"
    &&
    gameState.handNumber === 4
  ) {

    if (
      dealerTenpai
    ) {

      return isDealerTopAtTargetV3()
        ? {
            end: true,
            reason: "オーラス終了"
          }
        : {
            end: false
          };

    }


    return topScore >=
      MAHJONGSOUL_TARGET_SCORE_V3
      ? {
          end: true,
          reason: "オーラス終了"
        }
      : {
          end: false
        };

  }


  if (
    gameState.roundWind === "西"
  ) {

    if (
      dealerTenpai
    ) {

      return isDealerTopAtTargetV3()
        ? {
            end: true,
            reason: "延長戦終了"
          }
        : {
            end: false
          };

    }


    if (
      topScore >=
        MAHJONGSOUL_TARGET_SCORE_V3
    ) {

      return {
        end: true,
        reason: "延長戦終了"
      };

    }


    if (
      gameState.handNumber === 4
    ) {

      return {
        end: true,
        reason: "西4局終了"
      };

    }

  }


  return {
    end: false
  };

}


function calculateNextRound() {

  let nextWind =
    gameState.roundWind;


  let nextHandNumber =
    gameState.handNumber
    + 1;


  if (
    nextWind === "東"
    &&
    nextHandNumber === 5
  ) {

    return {
      endCheck: false,
      roundWind: "南",
      handNumber: 1
    };

  }


  if (
    nextWind === "南"
    &&
    nextHandNumber === 5
  ) {

    return {
      endCheck: false,
      roundWind: "西",
      handNumber: 1
    };

  }


  if (
    nextWind === "西"
    &&
    nextHandNumber === 5
  ) {

    return {
      endCheck: true,
      roundWind: "西",
      handNumber: 4
    };

  }


  return {
    endCheck: false,
    roundWind: nextWind,
    handNumber: nextHandNumber
  };

}


function awardRemainingKyotakuToTopV3() {

  if (
    gameState.kyotaku <= 0
  ) {

    return;

  }


  const topPosition =
    getTopPositionV3();


  gameState.scores[
    topPosition
  ] +=
    gameState.kyotaku
    * 1000;


  gameState.kyotaku =
    0;

}


function buildNormalFinishedResultV3(
  reason
) {

  awardRemainingKyotakuToTopV3();


  const ranking =
    getFinalRankingV1();


  return {

    version:
      1,

    status:
      "終了済み",

    reason,

    savedAt:
      new Date()
        .toISOString(),

    roundWind:
      gameState.roundWind,

    handNumber:
      gameState.handNumber,

    honba:
      gameState.honba,

    kyotaku:
      0,

    players:
      ranking.map(
        (position, index) => ({

          rank:
            index + 1,

          position,

          name:
            currentPlayers[
              position
            ],

          score:
            gameState.scores[
              position
            ]

        })
      )

  };

}


function finishNormalMatchV3(
  reason
) {

  const result =
    buildNormalFinishedResultV3(
      reason
    );


  localStorage.setItem(
    FINISHED_MATCH_KEY_V1,
    JSON.stringify(
      result
    )
  );


  agariFlow.active =
    false;


  agariFlow.committed =
    false;


  agariFlow.pendingMovement =
    null;


  agariCancelButton.style.display =
    "";


  agariOverlay
    .classList
    .add(
      "hidden"
    );


  if (
    ryuukyokuFlowV1.active
  ) {

    closeRyuukyokuFlowV1();

  }


  clearActiveMatchStorageV1();


  localStorage.removeItem(
    INTERRUPTED_MATCH_KEY_V1
  );


  updateGameUI();


  renderFinalResultV1(
    result
  );

}


/* ========================================
   次の親
======================================== */

function getNextDealerPosition() {

  const currentIndex =
    positions.indexOf(
      dealerPosition
    );


  return positions[
    (
      currentIndex
      + 1
    ) % 4
  ];

}


/* ========================================
   アガリ確定後画面 Ver.3
======================================== */

function renderAppliedAgariResult() {

  agariFlowTitle.textContent =
    "点数を反映しました";


  const winnerNames =
    agariFlow.winners
      .map(
        (position) =>
          currentPlayers[
            position
          ]
      )
      .join("・");


  const dealerWon =
    agariFlow.winners.includes(
      dealerPosition
    );


  const endDecision =
    getAgariEndDecisionV3();


  if (
    endDecision.end
  ) {

    agariFlowContent.innerHTML = `

      <div class="applied-result">

        <strong>

          ${
            agariFlow.type === "ron"
              ? "ロン"
              : "ツモ"
          }

          ・

          ${escapeHtml(winnerNames)}

        </strong>


        <p>
          持ち点・順位・供託を更新しました
        </p>

      </div>


      <div class="round-next-info">

        <strong>
          ${escapeHtml(endDecision.reason)}
        </strong>

        <span>
          対局を終了します
        </span>

      </div>


      <button
        id="next-hand-button"
        class="next-hand-button"
      >
        最終結果へ
      </button>
    `;


    document
      .getElementById(
        "next-hand-button"
      )
      .onclick =
      () => {

        finishNormalMatchV3(
          endDecision.reason
        );

      };


    agariCancelButton.style.display =
      "none";


    return;

  }


  let nextButtonText =
    "";


  let nextDescription =
    "";


  if (
    dealerWon
  ) {

    const nextHonba =
      gameState.honba
      + 1;


    nextButtonText =
      `親連荘・${nextHonba}本場へ`;


    nextDescription =
      `${getRoundName()}のまま親が続きます`;

  } else {

    const nextRound =
      calculateNextRound();


    nextButtonText =
      `親交代・${
        nextRound.roundWind
      }${
        nextRound.handNumber
      }局へ`;


    const isWestEntry =
      gameState.roundWind === "南"
      &&
      gameState.handNumber === 4
      &&
      nextRound.roundWind === "西"
      &&
      nextRound.handNumber === 1;


    if (
      isWestEntry
    ) {

      nextDescription =
        `トップが${
          getTopScoreV3()
            .toLocaleString("ja-JP")
        }点で30,000点未満のため西入します（次の親：${
          currentPlayers[
            getNextDealerPosition()
          ]
        }）`;

    } else {

      nextDescription =
        `次の親：${
          currentPlayers[
            getNextDealerPosition()
          ]
        }`;

    }

  }


  agariFlowContent.innerHTML = `

    <div class="applied-result">

      <strong>

        ${
          agariFlow.type === "ron"
            ? "ロン"
            : "ツモ"
        }

        ・

        ${escapeHtml(winnerNames)}

      </strong>


      <p>
        持ち点・順位・供託を更新しました
      </p>

    </div>


    <div class="round-next-info">

      <strong>
        ${escapeHtml(nextButtonText)}
      </strong>

      <span>
        ${escapeHtml(nextDescription)}
      </span>

    </div>


    <button
      id="next-hand-button"
      class="next-hand-button"
    >
      ${escapeHtml(nextButtonText)}
    </button>
  `;


  document
    .getElementById(
      "next-hand-button"
    )
    .onclick =
    () => {

      proceedAfterAgari(
        dealerWon
      );

    };


  agariCancelButton.style.display =
    "none";

}


/* ========================================
   アガリ後の局進行 Ver.3
======================================== */

function proceedAfterAgari(
  dealerWon
) {

  const endDecision =
    getAgariEndDecisionV3();


  if (
    endDecision.end
  ) {

    finishNormalMatchV3(
      endDecision.reason
    );

    return;

  }


  if (
    dealerWon
  ) {

    gameState.honba +=
      1;


    finishHandTransition();

    return;

  }


  const nextRound =
    calculateNextRound();


  if (
    nextRound.endCheck
  ) {

    finishNormalMatchV3(
      "西4局終了"
    );

    return;

  }


  gameState.honba =
    0;


  gameState.roundWind =
    nextRound.roundWind;


  gameState.handNumber =
    nextRound.handNumber;


  dealerPosition =
    getNextDealerPosition();


  updateDealerAndSeatWinds();


  finishHandTransition();

}


/* ========================================
   親・席風更新
======================================== */

function updateDealerAndSeatWinds() {

  const winds =
    getSeatWinds();


  positions.forEach(
    (position) => {

      const panel =
        document.getElementById(
          `panel-${position}`
        );


      panel.classList.remove(
        "dealer"
      );


      document
        .getElementById(
          `wind-${position}`
        )
        .textContent =
        winds[
          position
        ];

    }
  );


  const dealerPanel =
    document.getElementById(
      `panel-${dealerPosition}`
    );


  dealerPanel.classList.add(
    "dealer"
  );


  /*
    新しい親を一瞬強調
  */

  flashElement(
    dealerPanel
  );

}


/* ========================================
   次局開始
======================================== */

function finishHandTransition() {

  updateRoundDisplay();


  /*
    アガリ入力画面を閉じる
  */

  closeAgariFlow();


  /*
    次のアガリで
    キャンセルが使える状態へ戻す
  */

  agariFlow.committed =
    false;


  agariFlow.pendingMovement =
    null;


  agariCancelButton.style.display =
    "";


  updateGameUI();

}


/* ========================================
   南4終了 仮画面
======================================== */

function showSouthFourEndPlaceholder() {

  agariFlowTitle.textContent =
    "南4局終了";


  agariFlowContent.innerHTML = `

    <div class="flow-placeholder">

      <strong>
        南4局が終了しました
      </strong>

      <p>
        次はトップ条件・延長条件を確認して、
        対局終了か延長かを自動判定します。
      </p>

    </div>
  `;

}
/* ========================================
   流局処理 Ver.1
======================================== */

const ryuukyokuFlowV1 = {

  active: false,

  stage: "select",

  tenpaiPlayers:
    new Set(),

  movement: null,

  dealerTenpai: false,

  committed: false

};


/* ========================================
   初期化
======================================== */

function initRyuukyokuFlowV1() {

  /*
    「流局」と書いてあるボタンを探す。

    IDを新しく調べなくても、
    今ある画面に接続できるようにしている。
  */

  const ryuukyokuButton =
    Array
      .from(
        document.querySelectorAll(
          "button"
        )
      )
      .find(
        (button) =>
          button
            .textContent
            .trim()
          ===
          "流局"
      );


  if (
    ryuukyokuButton
  ) {

    ryuukyokuButton
      .addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          event.stopPropagation();

          event.stopImmediatePropagation();


          openRyuukyokuFlowV1();

        },
        true
      );

  }


  /*
    流局入力中だけ、
    4人のパネルを
    テンパイ選択ボタンとして使う。
  */

  positions.forEach(
    (position) => {

      const panel =
        document.getElementById(
          `panel-${position}`
        );


      if (
        !panel
      ) {

        return;

      }


      panel
        .addEventListener(
          "click",
          (event) => {

            if (
              !ryuukyokuFlowV1.active
              ||
              ryuukyokuFlowV1.stage
              !==
              "select"
            ) {

              return;

            }


            event.preventDefault();

            event.stopPropagation();

            event.stopImmediatePropagation();


            toggleRyuukyokuTenpaiV1(
              position
            );

          },
          true
        );

    }
  );

}


/* ========================================
   オーバーレイ取得
======================================== */

function getRyuukyokuOverlayV1() {

  let overlay =
    document.getElementById(
      "ryuukyoku-flow-overlay"
    );


  if (
    overlay
  ) {

    return overlay;

  }


  overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "ryuukyoku-flow-overlay";


  overlay.style.display =
    "none";


  document.body.appendChild(
    overlay
  );


  return overlay;

}


/* ========================================
   流局入力開始
======================================== */

function openRyuukyokuFlowV1() {

  /*
    アガリ入力などが
    開いている場合は開始しない。
  */

  if (
    ryuukyokuFlowV1.active
  ) {

    return;

  }


  ryuukyokuFlowV1.active =
    true;


  ryuukyokuFlowV1.stage =
    "select";


  ryuukyokuFlowV1.tenpaiPlayers =
    new Set();


  ryuukyokuFlowV1.movement =
    null;


  ryuukyokuFlowV1.committed =
    false;


  const overlay =
    getRyuukyokuOverlayV1();


  overlay.style.display =
    "block";


  renderRyuukyokuSelectionV1();

}


/* ========================================
   テンパイ選択
======================================== */

function toggleRyuukyokuTenpaiV1(
  position
) {

  if (
    ryuukyokuFlowV1
      .tenpaiPlayers
      .has(
        position
      )
  ) {

    ryuukyokuFlowV1
      .tenpaiPlayers
      .delete(
        position
      );

  } else {

    ryuukyokuFlowV1
      .tenpaiPlayers
      .add(
        position
      );

  }


  refreshRyuukyokuPlayerSelectionV1();


  renderRyuukyokuSelectionV1();

}


/* ========================================
   プレイヤーパネル表示
======================================== */

function refreshRyuukyokuPlayerSelectionV1() {

  positions.forEach(
    (position) => {

      const panel =
        document.getElementById(
          `panel-${position}`
        );


      if (
        !panel
      ) {

        return;

      }


      const oldBadge =
        panel.querySelector(
          ".draw-tenpai-badge"
        );


      if (
        oldBadge
      ) {

        oldBadge.remove();

      }


      panel.classList.remove(
        "draw-tenpai-selected"
      );


      if (
        ryuukyokuFlowV1
          .tenpaiPlayers
          .has(
            position
          )
      ) {

        panel.classList.add(
          "draw-tenpai-selected"
        );


        const badge =
          document.createElement(
            "span"
          );


        badge.className =
          "draw-tenpai-badge";


        badge.textContent =
          "テンパイ ✓";


        panel.appendChild(
          badge
        );

      }

    }
  );

}


/* ========================================
   テンパイ選択画面
======================================== */

function renderRyuukyokuSelectionV1() {

  const overlay =
    getRyuukyokuOverlayV1();


  const selected =
    Array.from(
      ryuukyokuFlowV1
        .tenpaiPlayers
    );


  let selectedText =
    "";


  if (
    selected.length === 0
  ) {

    selectedText =
      "全員ノーテン";

  } else if (
    selected.length === 4
  ) {

    selectedText =
      "全員テンパイ";

  } else {

    selectedText =
      `テンパイ：${
        selected
          .map(
            (position) =>
              escapeHtml(
                currentPlayers[
                  position
                ]
              )
          )
          .join("・")
      }`;

  }


  overlay.innerHTML = `

    <h2>
      流局
    </h2>


    <p class="ryuukyoku-description">
      テンパイしているプレイヤーをタップ
    </p>


    <div class="ryuukyoku-selected-info">
      ${selectedText}
    </div>


    <p class="ryuukyoku-description">
      0人・4人の場合もそのまま進めます
    </p>


    <div class="ryuukyoku-button-row">

      <button
        id="ryuukyoku-cancel-button"
        class="ryuukyoku-back-button"
      >
        キャンセル
      </button>


      <button
        id="ryuukyoku-preview-button"
        class="ryuukyoku-next-button"
      >
        次へ
      </button>

    </div>
  `;


  document
    .getElementById(
      "ryuukyoku-cancel-button"
    )
    .onclick =
    closeRyuukyokuFlowV1;


  document
    .getElementById(
      "ryuukyoku-preview-button"
    )
    .onclick =
    renderRyuukyokuResultPreviewV1;

}


/* ========================================
   3000点を計算
======================================== */

function calculateRyuukyokuMovementV1() {

  const tenpai =
    ryuukyokuFlowV1
      .tenpaiPlayers;


  const count =
    tenpai.size;


  const movement =
    {};


  positions.forEach(
    (position) => {

      movement[
        position
      ] = 0;

    }
  );


  /*
    全員ノーテン
    または
    全員テンパイ

    → 点数移動なし
  */

  if (
    count === 0
    ||
    count === 4
  ) {

    return movement;

  }


  /*
    1人テンパイ

    +3000
    他3人 -1000
  */

  if (
    count === 1
  ) {

    positions.forEach(
      (position) => {

        movement[
          position
        ] =
        tenpai.has(
          position
        )
          ? 3000
          : -1000;

      }
    );

  }


  /*
    2人テンパイ

    +1500 ×2
    -1500 ×2
  */

  if (
    count === 2
  ) {

    positions.forEach(
      (position) => {

        movement[
          position
        ] =
        tenpai.has(
          position
        )
          ? 1500
          : -1500;

      }
    );

  }


  /*
    3人テンパイ

    +1000 ×3
    ノーテン1人 -3000
  */

  if (
    count === 3
  ) {

    positions.forEach(
      (position) => {

        movement[
          position
        ] =
        tenpai.has(
          position
        )
          ? 1000
          : -3000;

      }
    );

  }


  return movement;

}


/* ========================================
   流局結果プレビュー
======================================== */

function renderRyuukyokuResultPreviewV1() {

  ryuukyokuFlowV1.stage =
    "preview";


  ryuukyokuFlowV1.movement =
    calculateRyuukyokuMovementV1();


  ryuukyokuFlowV1.dealerTenpai =
    ryuukyokuFlowV1
      .tenpaiPlayers
      .has(
        dealerPosition
      );


  const movement =
    ryuukyokuFlowV1
      .movement;


  showRyuukyokuDeltaChipsV1(
    movement
  );


  const movementRows =
    positions
      .map(
        (position) => {

          const delta =
            movement[
              position
            ];


          let className =
            "ryuukyoku-zero";


          let text =
            "±0";


          if (
            delta > 0
          ) {

            className =
              "ryuukyoku-plus";


            text =
              `+${
                delta.toLocaleString(
                  "ja-JP"
                )
              }`;

          }


          if (
            delta < 0
          ) {

            className =
              "ryuukyoku-minus";


            text =
              delta.toLocaleString(
                "ja-JP"
              );

          }


          return `

            <div class="ryuukyoku-result-row">

              <span>
                ${
                  escapeHtml(
                    currentPlayers[
                      position
                    ]
                  )
                }
              </span>

              <strong class="${className}">
                ${text}
              </strong>

            </div>
          `;

        }
      )
      .join("");


  const nextState =
    getRyuukyokuNextStateTextV1();


  const overlay =
    getRyuukyokuOverlayV1();


  overlay.innerHTML = `

    <h2>
      流局結果
    </h2>


    <div class="ryuukyoku-result-list">
      ${movementRows}
    </div>


    <div class="ryuukyoku-next-state">

      <strong>
        ${escapeHtml(nextState.title)}
      </strong>

      <span>
        ${escapeHtml(nextState.detail)}
      </span>

    </div>


    <div class="ryuukyoku-button-row">

      <button
        id="ryuukyoku-back-button"
        class="ryuukyoku-back-button"
      >
        戻る
      </button>


      <button
        id="ryuukyoku-confirm-button"
        class="ryuukyoku-confirm-button"
      >
        確定
      </button>

    </div>
  `;


  document
    .getElementById(
      "ryuukyoku-back-button"
    )
    .onclick =
    () => {

      clearRyuukyokuDeltaChipsV1();


      ryuukyokuFlowV1.stage =
        "select";


      renderRyuukyokuSelectionV1();

    };


  document
    .getElementById(
      "ryuukyoku-confirm-button"
    )
    .onclick =
    confirmRyuukyokuPointsV1;

}


/* ========================================
   流局後の次状態表示 Ver.3
======================================== */

function getRyuukyokuNextStateTextV1() {

  const nextHonba =
    gameState.honba
    + 1;


  const endDecision =
    getRyuukyokuEndDecisionV3();


  if (
    endDecision.end
  ) {

    return {

      title:
        endDecision.reason,

      detail:
        "対局を終了します"

    };

  }


  if (
    ryuukyokuFlowV1
      .dealerTenpai
  ) {

    return {

      title:
        `${getRoundName()}・${nextHonba}本場`,

      detail:
        "親テンパイのため連荘"

    };

  }


  const nextRound =
    calculateNextRound();


  const isWestEntry =
    gameState.roundWind === "南"
    &&
    gameState.handNumber === 4
    &&
    nextRound.roundWind === "西"
    &&
    nextRound.handNumber === 1;


  return {

    title:
      `${
        nextRound.roundWind
      }${
        nextRound.handNumber
      }局・${nextHonba}本場`,

    detail:
      isWestEntry
        ? `トップが${
            getTopScoreV3()
              .toLocaleString("ja-JP")
          }点で30,000点未満のため西入します（次の親：${
            currentPlayers[
              getNextDealerPosition()
            ]
          }）`
        : `親：${
            currentPlayers[
              getNextDealerPosition()
            ]
          }`

  };

}


/* ========================================
   点数読み取り
======================================== */

function readRyuukyokuPlayerScoreV1(
  position
) {

  /*
    現在使っている可能性のある
    点数データ構造を順番に確認する。
  */

  if (
    gameState.scores
    &&
    typeof
      gameState.scores[
        position
      ]
    ===
    "number"
  ) {

    return gameState.scores[
      position
    ];

  }


  if (
    gameState.playerScores
    &&
    typeof
      gameState.playerScores[
        position
      ]
    ===
    "number"
  ) {

    return gameState.playerScores[
      position
    ];

  }


  if (
    gameState.points
    &&
    typeof
      gameState.points[
        position
      ]
    ===
    "number"
  ) {

    return gameState.points[
      position
    ];

  }


  if (
    typeof playerScores
    !==
    "undefined"
    &&
    playerScores
    &&
    typeof
      playerScores[
        position
      ]
    ===
    "number"
  ) {

    return playerScores[
      position
    ];

  }


  /*
    最後に画面上の点数から取得
  */

  const scoreElement =
    document.getElementById(
      `score-${position}`
    );


  if (
    scoreElement
  ) {

    const number =
      Number(
        scoreElement
          .textContent
          .replace(
            /,/g,
            ""
          )
          .replace(
            /[^\d-]/g,
            ""
          )
      );


    if (
      Number.isFinite(
        number
      )
    ) {

      return number;

    }

  }


  return 25000;

}


/* ========================================
   点数書き込み
======================================== */

function writeRyuukyokuPlayerScoreV1(
  position,
  newScore
) {

  let wrote =
    false;


  if (
    gameState.scores
    &&
    Object.prototype
      .hasOwnProperty
      .call(
        gameState.scores,
        position
      )
  ) {

    gameState.scores[
      position
    ] =
      newScore;


    wrote =
      true;

  }


  if (
    gameState.playerScores
    &&
    Object.prototype
      .hasOwnProperty
      .call(
        gameState.playerScores,
        position
      )
  ) {

    gameState.playerScores[
      position
    ] =
      newScore;


    wrote =
      true;

  }


  if (
    gameState.points
    &&
    Object.prototype
      .hasOwnProperty
      .call(
        gameState.points,
        position
      )
  ) {

    gameState.points[
      position
    ] =
      newScore;


    wrote =
      true;

  }


  if (
    typeof playerScores
    !==
    "undefined"
    &&
    playerScores
    &&
    Object.prototype
      .hasOwnProperty
      .call(
        playerScores,
        position
      )
  ) {

    playerScores[
      position
    ] =
      newScore;


    wrote =
      true;

  }


  /*
    画面上の点数も更新
  */

  const scoreElement =
    document.getElementById(
      `score-${position}`
    );


  if (
    scoreElement
  ) {

    scoreElement.textContent =
      newScore.toLocaleString(
        "ja-JP"
      );

  }


  return wrote;

}


/* ========================================
   点数確定
======================================== */

function confirmRyuukyokuPointsV1() {

  if (
    ryuukyokuFlowV1.committed
  ) {

    return;

  }


  positions.forEach(
    (position) => {

      const currentScore =
        readRyuukyokuPlayerScoreV1(
          position
        );


      const delta =
        ryuukyokuFlowV1
          .movement[
            position
          ];


      writeRyuukyokuPlayerScoreV1(
        position,
        currentScore
        +
        delta
      );

    }
  );


  ryuukyokuFlowV1.committed =
    true;


  /*
    既存の順位・点数表示更新を使う
  */

  if (
    typeof updateGameUI
    ===
    "function"
  ) {

    updateGameUI();

  }


  /*
    updateGameUI後にも
    点数表示を確実に合わせる
  */

  positions.forEach(
    (position) => {

      const score =
        readRyuukyokuPlayerScoreV1(
          position
        );


      const scoreElement =
        document.getElementById(
          `score-${position}`
        );


      if (
        scoreElement
      ) {

        scoreElement.textContent =
          score.toLocaleString(
            "ja-JP"
          );

      }

    }
  );


  renderRyuukyokuAppliedV1();

}


/* ========================================
   流局 点数反映後 Ver.3
======================================== */

function renderRyuukyokuAppliedV1() {

  ryuukyokuFlowV1.stage =
    "applied";


  clearRyuukyokuSelectionV1();


  const endDecision =
    getRyuukyokuEndDecisionV3();


  const nextState =
    getRyuukyokuNextStateTextV1();


  const overlay =
    getRyuukyokuOverlayV1();


  if (
    endDecision.end
  ) {

    overlay.innerHTML = `

      <h2>
        流局を反映しました
      </h2>


      <div class="ryuukyoku-next-state">

        <strong>
          ${escapeHtml(endDecision.reason)}
        </strong>

        <span>
          対局を終了します
        </span>

      </div>


      <div class="ryuukyoku-button-row">

        <button
          id="ryuukyoku-next-hand-button"
          class="ryuukyoku-confirm-button"
        >
          最終結果へ
        </button>

      </div>
    `;


    document
      .getElementById(
        "ryuukyoku-next-hand-button"
      )
      .onclick =
      proceedAfterRyuukyokuV1;


    return;

  }


  let nextButtonText =
    "";


  if (
    ryuukyokuFlowV1
      .dealerTenpai
  ) {

    nextButtonText =
      `親連荘・${
        gameState.honba
        +
        1
      }本場へ`;

  } else {

    const nextRound =
      calculateNextRound();


    nextButtonText =
      `親交代・${
        nextRound.roundWind
      }${
        nextRound.handNumber
      }局・${
        gameState.honba
        +
        1
      }本場へ`;

  }


  overlay.innerHTML = `

    <h2>
      流局を反映しました
    </h2>


    <div class="ryuukyoku-next-state">

      <strong>
        ${escapeHtml(nextState.title)}
      </strong>

      <span>
        ${escapeHtml(nextState.detail)}
      </span>

    </div>


    <div class="ryuukyoku-button-row">

      <button
        id="ryuukyoku-next-hand-button"
        class="ryuukyoku-confirm-button"
      >
        ${escapeHtml(nextButtonText)}
      </button>

    </div>
  `;


  document
    .getElementById(
      "ryuukyoku-next-hand-button"
    )
    .onclick =
    proceedAfterRyuukyokuV1;

}


/* ========================================
   流局 次局へ Ver.3
======================================== */

function proceedAfterRyuukyokuV1() {

  /*
    次局進行操作のタイミングで
    流局による本場+1を確定する。
  */

  gameState.honba +=
    1;


  const endDecision =
    getRyuukyokuEndDecisionV3();


  if (
    endDecision.end
  ) {

    finishNormalMatchV3(
      endDecision.reason
    );

    return;

  }


  /*
    次局ではリーチ表示だけ解除。
    支払い済み1000点と供託はそのまま残る。
  */

  positions.forEach(
    (position) => {

      gameState.riichi[
        position
      ] = false;

    }
  );


  if (
    !ryuukyokuFlowV1
      .dealerTenpai
  ) {

    const nextRound =
      calculateNextRound();


    if (
      nextRound.endCheck
    ) {

      finishNormalMatchV3(
        "西4局終了"
      );

      return;

    }


    gameState.roundWind =
      nextRound.roundWind;


    gameState.handNumber =
      nextRound.handNumber;


    dealerPosition =
      getNextDealerPosition();


    updateDealerAndSeatWinds();

  }


  updateRoundDisplay();


  if (
    typeof updateGameUI === "function"
  ) {

    updateGameUI();

  }


  closeRyuukyokuFlowV1();

}


/* ========================================
   南4終了 仮画面
======================================== */

function renderRyuukyokuSouthFourPlaceholderV1() {

  clearRyuukyokuDeltaChipsV1();


  const overlay =
    getRyuukyokuOverlayV1();


  overlay.innerHTML = `

    <h2>
      南4局終了
    </h2>


    <p class="ryuukyoku-description">
      次にトップ条件・延長条件を実装して、
      対局終了か延長かを自動判定します。
    </p>
  `;

}


/* ========================================
   点数変動チップ
======================================== */

function showRyuukyokuDeltaChipsV1(
  movement
) {

  clearRyuukyokuDeltaChipsV1();


  positions.forEach(
    (position) => {

      const delta =
        movement[
          position
        ];


      if (
        delta === 0
      ) {

        return;

      }


      const panel =
        document.getElementById(
          `panel-${position}`
        );


      if (
        !panel
      ) {

        return;

      }


      const chip =
        document.createElement(
          "span"
        );


      chip.className =
        "draw-delta-chip";


      chip.textContent =
        delta > 0
          ?
          `+${
            delta.toLocaleString(
              "ja-JP"
            )
          }`
          :
          delta.toLocaleString(
            "ja-JP"
          );


      panel.appendChild(
        chip
      );

    }
  );

}


/* ========================================
   点数変動チップ削除
======================================== */

function clearRyuukyokuDeltaChipsV1() {

  document
    .querySelectorAll(
      ".draw-delta-chip"
    )
    .forEach(
      (chip) =>
        chip.remove()
    );

}


/* ========================================
   テンパイ表示だけ削除
======================================== */

function clearRyuukyokuSelectionV1() {

  positions.forEach(
    (position) => {

      const panel =
        document.getElementById(
          `panel-${position}`
        );


      if (
        !panel
      ) {

        return;

      }


      panel.classList.remove(
        "draw-tenpai-selected"
      );


      const badge =
        panel.querySelector(
          ".draw-tenpai-badge"
        );


      if (
        badge
      ) {

        badge.remove();

      }

    }
  );

}


/* ========================================
   流局入力終了
======================================== */

function closeRyuukyokuFlowV1() {

  clearRyuukyokuSelectionV1();

  clearRyuukyokuDeltaChipsV1();


  const overlay =
    getRyuukyokuOverlayV1();


  overlay.style.display =
    "none";


  ryuukyokuFlowV1.active =
    false;


  ryuukyokuFlowV1.stage =
    "select";


  ryuukyokuFlowV1.tenpaiPlayers =
    new Set();


  ryuukyokuFlowV1.movement =
    null;


  ryuukyokuFlowV1.committed =
    false;

}


/* ========================================
   起動
======================================== */

if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initRyuukyokuFlowV1
  );

} else {

  initRyuukyokuFlowV1();

}
/* ========================================
   Undo / Redo Ver.1
======================================== */


/*
  履歴は最大3件。

  undoHistoryV1
  = 現在戻せる確定操作

  redoActionsV1
  = Undo直後だけ復元できる操作
*/

const undoHistoryV1 = [];

let redoActionsV1 = [];

let undoTrackingSuspendedV1 = false;


/* ========================================
   現在の状態を取得
======================================== */

function captureUndoStateV1() {

  const scores = {};


  positions.forEach(
    (position) => {

      scores[position] =
        readRyuukyokuPlayerScoreV1(
          position
        );

    }
  );


  /*
    gameState内の
    数値・文字列・真偽値を保存。

    本場・供託・局などを
   まとめて追跡できる。
  */

  const primitives = {};


  Object.entries(
    gameState
  ).forEach(
    ([key, value]) => {

      if (
        typeof value === "number"
        ||
        typeof value === "string"
        ||
        typeof value === "boolean"
      ) {

        primitives[key] =
          value;

      }

    }
  );


  return {

    scores,

    primitives,

    dealerPosition

  };

}


/* ========================================
   状態に変化があるか
======================================== */

function undoStatesEqualV1(
  before,
  after
) {

  return (
    JSON.stringify(before)
    ===
    JSON.stringify(after)
  );

}


/* ========================================
   確定操作を履歴化
======================================== */

function trackCommittedActionV1(
  label,
  actionFunction
) {

  /*
    Undo/Redo自身から呼ばれた場合は
    新しい履歴を作らない。
  */

  if (
    undoTrackingSuspendedV1
  ) {

    return actionFunction();

  }


  const before =
    captureUndoStateV1();


  const result =
    actionFunction();


  const after =
    captureUndoStateV1();


  if (
    !undoStatesEqualV1(
      before,
      after
    )
  ) {

    undoHistoryV1.push({

      label,

      before,

      after

    });


    /*
      直近3件だけ残す
    */

    while (
      undoHistoryV1.length > 3
    ) {

      undoHistoryV1.shift();

    }


    /*
      新しい確定操作が入ったら
      Redoは消える
    */

    redoActionsV1 = [];


    updateRedoButtonV1();

  }


  return result;

}


/* ========================================
   差分をUndo / Redo
======================================== */

function applyHistoryActionV1(
  action,
  direction
) {

  const isUndo =
    direction === "undo";


  /*
    点数は「絶対値に戻す」のではなく
    操作で動いた分だけ逆方向に動かす。

    これにより、
    履歴外のリーチ操作を
    できるだけ巻き込まない。
  */

  positions.forEach(
    (position) => {

      const beforeScore =
        action.before
          .scores[position];


      const afterScore =
        action.after
          .scores[position];


      const delta =
        afterScore
        -
        beforeScore;


      const currentScore =
        readRyuukyokuPlayerScoreV1(
          position
        );


      const newScore =
        isUndo
          ?
          currentScore - delta
          :
          currentScore + delta;


      writeRyuukyokuPlayerScoreV1(
        position,
        newScore
      );

    }
  );


  /*
    gameStateの基本値
  */

  const allKeys =
    new Set([
      ...Object.keys(
        action.before.primitives
      ),
      ...Object.keys(
        action.after.primitives
      )
    ]);


  allKeys.forEach(
    (key) => {

      const beforeValue =
        action.before
          .primitives[key];


      const afterValue =
        action.after
          .primitives[key];


      /*
        数値は差分で戻す。

        本場・供託など。
      */

      if (
        typeof beforeValue
          ===
          "number"
        &&
        typeof afterValue
          ===
          "number"
        &&
        typeof gameState[key]
          ===
          "number"
      ) {

        const delta =
          afterValue
          -
          beforeValue;


        gameState[key] =
          isUndo
            ?
            gameState[key] - delta
            :
            gameState[key] + delta;


        return;

      }


      /*
        東/南などの文字列、
        真偽値はその時点の値へ戻す。
      */

      gameState[key] =
        isUndo
          ?
          beforeValue
          :
          afterValue;

    }
  );


  dealerPosition =
    isUndo
      ?
      action.before.dealerPosition
      :
      action.after.dealerPosition;

}


/* ========================================
   画面を現在状態に同期
======================================== */

function refreshAfterUndoRedoV1() {

  if (
    typeof updateDealerAndSeatWinds
    ===
    "function"
  ) {

    updateDealerAndSeatWinds();

  }


  if (
    typeof updateRoundDisplay
    ===
    "function"
  ) {

    updateRoundDisplay();

  }


  if (
    typeof updateGameUI
    ===
    "function"
  ) {

    updateGameUI();

  }


  /*
    updateGameUI後にも
    点数を現在値に合わせる
  */

  positions.forEach(
    (position) => {

      const score =
        readRyuukyokuPlayerScoreV1(
          position
        );


      const element =
        document.getElementById(
          `score-${position}`
        );


      if (
        element
      ) {

        element.textContent =
          score.toLocaleString(
            "ja-JP"
          );

      }

    }
  );

}


/* ========================================
   Undoボタンを取得
======================================== */

function getUndoButtonV1() {

  return Array
    .from(
      document.querySelectorAll(
        "button"
      )
    )
    .find(
      (button) =>
        button
          .textContent
          .trim()
        ===
        "Undo"
    );

}


/* ========================================
   Undo画面
======================================== */

function openUndoHistoryV1() {

  if (
    undoHistoryV1.length === 0
  ) {

    showUndoToastV1(
      "戻せる操作はありません"
    );

    return;

  }


  closeUndoOverlayV1();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "undo-history-overlay";


  overlay.className =
    "undo-history-overlay";


  const newestFirst =
    [...undoHistoryV1]
      .map(
        (action, index) => ({

          action,

          historyIndex:
            index

        })
      )
      .reverse();


  const rows =
    newestFirst
      .map(
        (
          {
            action,
            historyIndex
          },
          displayIndex
        ) => {

          return `

            <button
              class="undo-history-item"
              data-history-index="${historyIndex}"
            >

              <strong>
                ${
                  escapeHtml(
                    action.label
                  )
                }
              </strong>

              <span>
                ${
                  displayIndex + 1
                }件前
              </span>

            </button>
          `;

        }
      )
      .join("");


  overlay.innerHTML = `

    <div class="undo-history-card">

      <h2>
        Undo
      </h2>

      <p class="undo-history-help">
        どの操作の直前まで戻しますか？
      </p>


      <div class="undo-history-list">
        ${rows}
      </div>


      <div class="undo-history-buttons">

        <button
          id="undo-overlay-close-button"
          class="undo-close-button"
        >
          閉じる
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  overlay
    .querySelectorAll(
      ".undo-history-item"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            const historyIndex =
              Number(
                button.dataset
                  .historyIndex
              );


            renderUndoConfirmV1(
              historyIndex
            );

          };

      }
    );


  document
    .getElementById(
      "undo-overlay-close-button"
    )
    .onclick =
    closeUndoOverlayV1;

}


/* ========================================
   Undo確認
======================================== */

function renderUndoConfirmV1(
  historyIndex
) {

  const overlay =
    document.getElementById(
      "undo-history-overlay"
    );


  if (
    !overlay
  ) {

    return;

  }


  const selectedAction =
    undoHistoryV1[
      historyIndex
    ];


  const undoCount =
    undoHistoryV1.length
    -
    historyIndex;


  overlay.innerHTML = `

    <div class="undo-history-card">

      <h2>
        元に戻しますか？
      </h2>


      <div class="undo-confirm-text">

        <strong>
          ${
            escapeHtml(
              selectedAction.label
            )
          }
        </strong>

        の直前まで戻します。

        ${
          undoCount > 1
            ?
            `<br>${undoCount}件の操作が取り消されます。`
            :
            ""
        }

      </div>


      <div class="undo-history-buttons">

        <button
          id="undo-confirm-cancel-button"
          class="undo-close-button"
        >
          戻る
        </button>


        <button
          id="undo-confirm-execute-button"
          class="undo-execute-button"
        >
          Undo
        </button>

      </div>

    </div>
  `;


  document
    .getElementById(
      "undo-confirm-cancel-button"
    )
    .onclick =
    openUndoHistoryV1;


  document
    .getElementById(
      "undo-confirm-execute-button"
    )
    .onclick =
    () => {

      executeUndoV1(
        historyIndex
      );

    };

}


/* ========================================
   Undo実行
======================================== */

function executeUndoV1(
  historyIndex
) {

  /*
    選択された操作から
    最新までを履歴から外す。
  */

  const actionsToUndo =
    undoHistoryV1.splice(
      historyIndex
    );


  undoTrackingSuspendedV1 =
    true;


  /*
    最新 → 古い順で戻す
  */

  [...actionsToUndo]
    .reverse()
    .forEach(
      (action) => {

        applyHistoryActionV1(
          action,
          "undo"
        );

      }
    );


  undoTrackingSuspendedV1 =
    false;


  /*
    Redo用には
    元の時間順で保存。
  */

  redoActionsV1 =
    actionsToUndo;


  closeUndoOverlayV1();


  /*
    古い結果画面が残らないようにする
  */

  if (
    typeof closeAgariFlow
    ===
    "function"
  ) {

    closeAgariFlow();

  }


  if (
    typeof ryuukyokuFlowV1
    !==
    "undefined"
    &&
    ryuukyokuFlowV1.active
    &&
    typeof closeRyuukyokuFlowV1
    ===
    "function"
  ) {

    closeRyuukyokuFlowV1();

  }


  refreshAfterUndoRedoV1();


  updateRedoButtonV1();


  showUndoToastV1(
    `${
      actionsToUndo.length
    }件の操作を元に戻しました`
  );

}


/* ========================================
   Redo実行
======================================== */

function executeRedoV1() {

  if (
    redoActionsV1.length === 0
  ) {

    return;

  }


  const actions =
    [...redoActionsV1];


  undoTrackingSuspendedV1 =
    true;


  /*
    古い → 新しい順で再実行
  */

  actions.forEach(
    (action) => {

      applyHistoryActionV1(
        action,
        "redo"
      );

    }
  );


  undoTrackingSuspendedV1 =
    false;


  actions.forEach(
    (action) => {

      undoHistoryV1.push(
        action
      );

    }
  );


  while (
    undoHistoryV1.length > 3
  ) {

    undoHistoryV1.shift();

  }


  redoActionsV1 = [];


  refreshAfterUndoRedoV1();


  updateRedoButtonV1();


  showUndoToastV1(
    `${
      actions.length
    }件の操作をやり直しました`
  );

}


/* ========================================
   Redoボタン
======================================== */

function createRedoButtonV1() {

  const undoButton =
    getUndoButtonV1();


  if (
    !undoButton
  ) {

    return;

  }


  if (
    document.getElementById(
      "redo-button-v1"
    )
  ) {

    return;

  }


  const redoButton =
    document.createElement(
      "button"
    );


  redoButton.id =
    "redo-button-v1";


  redoButton.className =
    "undo-redo-button";


  redoButton.textContent =
    "Redo";


  redoButton.hidden =
    true;


  redoButton.onclick =
    executeRedoV1;


  undoButton.insertAdjacentElement(
    "afterend",
    redoButton
  );

}


/* ========================================
   Redo表示更新
======================================== */

function updateRedoButtonV1() {

  const redoButton =
    document.getElementById(
      "redo-button-v1"
    );


  if (
    !redoButton
  ) {

    return;

  }


  redoButton.hidden =
    redoActionsV1.length === 0;

}


/* ========================================
   上中央通知
======================================== */

let undoToastTimerV1 =
  null;


function showUndoToastV1(
  message
) {

  let toast =
    document.getElementById(
      "undo-toast-v1"
    );


  if (
    !toast
  ) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "undo-toast-v1";


    toast.className =
      "undo-toast";


    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    undoToastTimerV1
  );


  undoToastTimerV1 =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2000
    );

}


/* ========================================
   Undo画面を閉じる
======================================== */

function closeUndoOverlayV1() {

  const overlay =
    document.getElementById(
      "undo-history-overlay"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


/* ========================================
   既存の確定処理を履歴対応にする
======================================== */


/*
  1.
  アガリ点数確定
*/

if (
  typeof confirmPointMovement
  ===
  "function"
) {

  const originalConfirmPointMovementUndoV1 =
    confirmPointMovement;


  confirmPointMovement =
    function (...args) {

      return trackCommittedActionV1(

        "アガリ・点数確定",

        () =>
          originalConfirmPointMovementUndoV1(
            ...args
          )

      );

    };

}


/*
  2.
  アガリ後の次局進行
*/

if (
  typeof proceedAfterAgari
  ===
  "function"
) {

  const originalProceedAfterAgariUndoV1 =
    proceedAfterAgari;


  proceedAfterAgari =
    function (...args) {

      return trackCommittedActionV1(

        "アガリ・次局進行",

        () =>
          originalProceedAfterAgariUndoV1(
            ...args
          )

      );

    };

}


/*
  3.
  流局点数確定
*/

if (
  typeof confirmRyuukyokuPointsV1
  ===
  "function"
) {

  const originalConfirmRyuukyokuPointsUndoV1 =
    confirmRyuukyokuPointsV1;


  confirmRyuukyokuPointsV1 =
    function (...args) {

      return trackCommittedActionV1(

        "流局・点数確定",

        () =>
          originalConfirmRyuukyokuPointsUndoV1(
            ...args
          )

      );

    };

}


/*
  4.
  流局後の次局進行
*/

if (
  typeof proceedAfterRyuukyokuV1
  ===
  "function"
) {

  const originalProceedAfterRyuukyokuUndoV1 =
    proceedAfterRyuukyokuV1;


  proceedAfterRyuukyokuV1 =
    function (...args) {

      return trackCommittedActionV1(

        "流局・次局進行",

        () =>
          originalProceedAfterRyuukyokuUndoV1(
            ...args
          )

      );

    };

}


/* ========================================
   Undoボタン接続
======================================== */

function initUndoRedoV1() {

  const undoButton =
    getUndoButtonV1();


  if (
    undoButton
  ) {

    undoButton.addEventListener(

      "click",

      (event) => {

        event.preventDefault();

        event.stopPropagation();

        event.stopImmediatePropagation();


        openUndoHistoryV1();

      },

      true

    );

  }


  createRedoButtonV1();

}


/* ========================================
   起動
======================================== */

if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initUndoRedoV1
  );

} else {

  initUndoRedoV1();

}
/* ========================================
   Undo / Redo Ver.2
   強制安定版
======================================== */

/*
  Ver.1のUndo接続に依存せず、
  実際に押された「確定ボタン」を監視して
  状態を履歴として保存する。

  既存ゲーム処理は変更しない。
*/


const undoHistoryV2 = [];

let redoHistoryV2 = [];

let undoRedoBusyV2 = false;


/* ========================================
   現在状態を保存
======================================== */

function captureGameStateV2() {

  const scores = {};

  positions.forEach(
    (position) => {

      scores[position] =
        gameState.scores[position];

    }
  );


  return {

    scores: {
      ...scores
    },

    kyotaku:
      gameState.kyotaku,

    honba:
      gameState.honba,

    roundWind:
      gameState.roundWind,

    handNumber:
      gameState.handNumber,

    dealerPosition:
      dealerPosition,

    riichi: {
      ...gameState.riichi
    }

  };

}


/* ========================================
   状態比較
======================================== */

function gameStatesEqualV2(
  stateA,
  stateB
) {

  return (
    JSON.stringify(stateA)
    ===
    JSON.stringify(stateB)
  );

}


/* ========================================
   履歴追加
======================================== */

function addUndoHistoryV2(
  label,
  before,
  after
) {

  if (
    undoRedoBusyV2
  ) {

    return;

  }


  if (
    gameStatesEqualV2(
      before,
      after
    )
  ) {

    return;

  }


  undoHistoryV2.push({

    label,

    before,

    after

  });


  /*
    最大3件
  */

  while (
    undoHistoryV2.length > 3
  ) {

    undoHistoryV2.shift();

  }


  /*
    新しい確定操作をしたら
    Redoは消える
  */

  redoHistoryV2 = [];


  updateRedoButtonV2();

}


/* ========================================
   Undoボタンを探す
======================================== */

function findUndoControlV2() {

  /*
    まずID候補
  */

  const idCandidates = [

    "undo-button",
    "undoButton",
    "game-undo-button"

  ];


  for (
    const id
    of idCandidates
  ) {

    const element =
      document.getElementById(
        id
      );


    if (
      element
    ) {

      return element;

    }

  }


  /*
    IDが違っても、
    画面上に「Undo」と表示されていれば探す
  */

  const elements =
    Array.from(
      document.querySelectorAll(
        "button, [role='button'], a, div, span"
      )
    );


  return (
    elements.find(
      (element) => {

        const text =
          element
            .textContent
            .trim();


        return (
          text === "Undo"
          ||
          text === "UNDO"
          ||
          text === "undo"
          ||
          text.endsWith("Undo")
        );

      }
    )
    || null
  );

}


/* ========================================
   Undoボタンが押されたか
======================================== */

function isUndoClickV2(
  event
) {

  const undoControl =
    findUndoControlV2();


  if (
    !undoControl
  ) {

    return false;

  }


  return (
    event.target
      === undoControl
    ||
    undoControl.contains(
      event.target
    )
  );

}


/* ========================================
   履歴対象ボタン
======================================== */

function getHistoryLabelFromButtonV2(
  button
) {

  if (
    !button
  ) {

    return null;

  }


  /*
    アガリの点数確定
  */

  if (
    button.id
    ===
    "movement-confirm-button"
  ) {

    return "アガリ・点数確定";

  }


  /*
    アガリ後の次局
  */

  if (
    button.id
    ===
    "next-hand-button"
  ) {

    return "アガリ・次局進行";

  }


  /*
    流局点数確定
  */

  if (
    button.id
    ===
    "ryuukyoku-confirm-button"
  ) {

    return "流局・点数確定";

  }


  /*
    流局後の次局
  */

  if (
    button.id
    ===
    "ryuukyoku-next-hand-button"
  ) {

    return "流局・次局進行";

  }


  return null;

}


/* ========================================
   クリック監視
======================================== */

document.addEventListener(
  "click",
  (event) => {

    /*
      Undoを最優先で取得。

      元のUndo処理が動かなくても、
      Ver.2が直接受け取る。
    */

    if (
      isUndoClickV2(
        event
      )
    ) {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      openUndoHistoryV2();

      return;

    }


    const button =
      event.target.closest(
        "button"
      );


    if (
      !button
    ) {

      return;

    }


    /*
      Redo
    */

    if (
      button.id
      ===
      "redo-button-v2"
    ) {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      executeRedoV2();

      return;

    }


    /*
      リーチ操作はUndo履歴には入れない。

      ただしUndo後にリーチ操作した場合、
      「Undo直後のみRedo」の条件から
      Redoは消す。
    */

    if (
      button.classList.contains(
        "riichi-button"
      )
      ||
      button.id
      ===
      "riichi-cancel-confirm"
    ) {

      if (
        redoHistoryV2.length > 0
      ) {

        setTimeout(
          () => {

            redoHistoryV2 = [];

            updateRedoButtonV2();

          },
          0
        );

      }


      return;

    }


    /*
      確定操作か確認
    */

    const historyLabel =
      getHistoryLabelFromButtonV2(
        button
      );


    if (
      !historyLabel
    ) {

      return;

    }


    /*
      ボタン本来の処理が動く「前」の状態
    */

    const before =
      captureGameStateV2();


    /*
      本来のonclickが終了した後に
      新しい状態を保存。
    */

    setTimeout(
      () => {

        const after =
          captureGameStateV2();


        addUndoHistoryV2(
          historyLabel,
          before,
          after
        );

      },
      0
    );

  },
  true
);


/* ========================================
   状態をUndo / Redo
======================================== */

function applyHistoryStateDifferenceV2(
  action,
  direction
) {

  const isUndo =
    direction
    ===
    "undo";


  /*
    点数

    絶対値で戻すのではなく、
    その操作で変化した点数分だけ
    戻す・やり直す。
  */

  positions.forEach(
    (position) => {

      const beforeScore =
        action.before
          .scores[position];


      const afterScore =
        action.after
          .scores[position];


      const difference =
        afterScore
        -
        beforeScore;


      if (
        isUndo
      ) {

        gameState.scores[
          position
        ] -=
          difference;

      } else {

        gameState.scores[
          position
        ] +=
          difference;

      }

    }
  );


  /*
    供託
  */

  const kyotakuDifference =
    action.after.kyotaku
    -
    action.before.kyotaku;


  gameState.kyotaku +=
    isUndo
      ? -kyotakuDifference
      : kyotakuDifference;


  /*
    本場
  */

  const honbaDifference =
    action.after.honba
    -
    action.before.honba;


  gameState.honba +=
    isUndo
      ? -honbaDifference
      : honbaDifference;


  /*
    局

    変化している操作だけ戻す。
  */

  if (
    action.before.roundWind
    !==
    action.after.roundWind
  ) {

    gameState.roundWind =
      isUndo

        ? action.before.roundWind

        : action.after.roundWind;

  }


  if (
    action.before.handNumber
    !==
    action.after.handNumber
  ) {

    gameState.handNumber =
      isUndo

        ? action.before.handNumber

        : action.after.handNumber;

  }


  /*
    親
  */

  if (
    action.before.dealerPosition
    !==
    action.after.dealerPosition
  ) {

    dealerPosition =
      isUndo

        ? action.before.dealerPosition

        : action.after.dealerPosition;

  }


  /*
    リーチ状態

    アガリ確定など、
    その操作自身によって
    リーチ状態が解除された場合のみ戻す。
  */

  positions.forEach(
    (position) => {

      const beforeRiichi =
        action.before
          .riichi[position];


      const afterRiichi =
        action.after
          .riichi[position];


      if (
        beforeRiichi
        !==
        afterRiichi
      ) {

        gameState.riichi[
          position
        ] =
          isUndo

            ? beforeRiichi

            : afterRiichi;

      }

    }
  );

}


/* ========================================
   UIを現在状態へ同期
======================================== */

function refreshGameUIAfterUndoV2() {

  /*
    親・席風
  */

  if (
    typeof
      updateDealerAndSeatWinds
    ===
    "function"
  ) {

    updateDealerAndSeatWinds();

  }


  /*
    局・本場・親名
  */

  if (
    typeof
      updateRoundDisplay
    ===
    "function"
  ) {

    updateRoundDisplay();

  }


  /*
    点数・順位・リーチ・供託
  */

  if (
    typeof
      updateGameUI
    ===
    "function"
  ) {

    updateGameUI();

  }

}


/* ========================================
   Undo画面
======================================== */

function openUndoHistoryV2() {

  closeUndoOverlayV2();


  /*
    履歴なしでも
    必ず反応を見せる。
  */

  if (
    undoHistoryV2.length
    ===
    0
  ) {

    showUndoToastV2(
      "戻せる操作はありません"
    );

    return;

  }


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "undo-history-overlay-v2";


  overlay.className =
    "undo-history-overlay";


  const newestFirst =
    undoHistoryV2
      .map(
        (action, index) => ({

          action,

          index

        })
      )
      .reverse();


  const rows =
    newestFirst
      .map(
        (
          item,
          displayIndex
        ) => {

          return `

            <button
              type="button"
              class="undo-history-item"
              data-v2-index="${item.index}"
            >

              <strong>
                ${
                  escapeHtml(
                    item.action.label
                  )
                }
              </strong>


              <span>

                ${
                  displayIndex
                  +
                  1
                }件前

              </span>

            </button>
          `;

        }
      )
      .join("");


  overlay.innerHTML = `

    <div class="undo-history-card">

      <h2>
        Undo
      </h2>


      <p class="undo-history-help">
        どの操作の直前まで戻しますか？
      </p>


      <div class="undo-history-list">

        ${rows}

      </div>


      <div class="undo-history-buttons">

        <button
          type="button"
          id="undo-v2-close"
          class="undo-close-button"
        >
          閉じる
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  overlay
    .querySelectorAll(
      "[data-v2-index]"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            renderUndoConfirmationV2(

              Number(
                button.dataset
                  .v2Index
              )

            );

          };

      }
    );


  document
    .getElementById(
      "undo-v2-close"
    )
    .onclick =
    closeUndoOverlayV2;

}


/* ========================================
   Undo確認
======================================== */

function renderUndoConfirmationV2(
  historyIndex
) {

  const overlay =
    document.getElementById(
      "undo-history-overlay-v2"
    );


  if (
    !overlay
  ) {

    return;

  }


  const action =
    undoHistoryV2[
      historyIndex
    ];


  if (
    !action
  ) {

    return;

  }


  const count =
    undoHistoryV2.length
    -
    historyIndex;


  overlay.innerHTML = `

    <div class="undo-history-card">

      <h2>
        元に戻しますか？
      </h2>


      <div class="undo-confirm-text">

        <strong>
          ${
            escapeHtml(
              action.label
            )
          }
        </strong>

        の直前まで戻します。


        ${
          count > 1

            ? `<br>${count}件の操作を取り消します。`

            : ""
        }

      </div>


      <div class="undo-history-buttons">

        <button
          type="button"
          id="undo-v2-back"
          class="undo-close-button"
        >
          戻る
        </button>


        <button
          type="button"
          id="undo-v2-confirm"
          class="undo-execute-button"
        >
          Undo
        </button>

      </div>

    </div>
  `;


  document
    .getElementById(
      "undo-v2-back"
    )
    .onclick =
    openUndoHistoryV2;


  document
    .getElementById(
      "undo-v2-confirm"
    )
    .onclick =
    () => {

      executeUndoV2(
        historyIndex
      );

    };

}


/* ========================================
   Undo実行
======================================== */

function executeUndoV2(
  historyIndex
) {

  if (
    undoRedoBusyV2
  ) {

    return;

  }


  const actions =
    undoHistoryV2.splice(
      historyIndex
    );


  if (
    actions.length
    ===
    0
  ) {

    return;

  }


  undoRedoBusyV2 =
    true;


  /*
    新しい操作から古い操作へ
  */

  [...actions]
    .reverse()
    .forEach(
      (action) => {

        applyHistoryStateDifferenceV2(
          action,
          "undo"
        );

      }
    );


  undoRedoBusyV2 =
    false;


  /*
    Redoは元の時系列順で保持
  */

  redoHistoryV2 =
    actions;


  /*
    開いている入力画面は閉じる
  */

  if (
    typeof closeAgariFlow
    ===
    "function"
    &&
    agariFlow.active
  ) {

    closeAgariFlow();

  }


  if (
    typeof
      closeRyuukyokuFlowV1
    ===
    "function"
    &&
    ryuukyokuFlowV1.active
  ) {

    closeRyuukyokuFlowV1();

  }


  closeUndoOverlayV2();


  refreshGameUIAfterUndoV2();


  updateRedoButtonV2();


  showUndoToastV2(

    `${
      actions.length
    }件の操作を元に戻しました`

  );

}


/* ========================================
   Redo
======================================== */

function executeRedoV2() {

  if (
    redoHistoryV2.length
    ===
    0
    ||
    undoRedoBusyV2
  ) {

    return;

  }


  const actions =
    [
      ...redoHistoryV2
    ];


  undoRedoBusyV2 =
    true;


  /*
    古い操作から順にやり直す
  */

  actions.forEach(
    (action) => {

      applyHistoryStateDifferenceV2(
        action,
        "redo"
      );

    }
  );


  undoRedoBusyV2 =
    false;


  actions.forEach(
    (action) => {

      undoHistoryV2.push(
        action
      );

    }
  );


  while (
    undoHistoryV2.length > 3
  ) {

    undoHistoryV2.shift();

  }


  redoHistoryV2 = [];


  refreshGameUIAfterUndoV2();


  updateRedoButtonV2();


  showUndoToastV2(

    `${
      actions.length
    }件の操作をやり直しました`

  );

}


/* ========================================
   Redoボタン
======================================== */

function createRedoButtonV2() {

  /*
    古いRedoがあれば削除
  */

  const oldRedo =
    document.getElementById(
      "redo-button-v1"
    );


  if (
    oldRedo
  ) {

    oldRedo.remove();

  }


  if (
    document.getElementById(
      "redo-button-v2"
    )
  ) {

    return;

  }


  const undoControl =
    findUndoControlV2();


  if (
    !undoControl
  ) {

    return;

  }


  const redoButton =
    document.createElement(
      "button"
    );


  redoButton.id =
    "redo-button-v2";


  redoButton.type =
    "button";


  redoButton.className =
    "undo-redo-button";


  redoButton.textContent =
    "Redo";


  redoButton.hidden =
    true;


  undoControl.insertAdjacentElement(
    "afterend",
    redoButton
  );

}


/* ========================================
   Redo表示
======================================== */

function updateRedoButtonV2() {

  let button =
    document.getElementById(
      "redo-button-v2"
    );


  if (
    !button
  ) {

    createRedoButtonV2();


    button =
      document.getElementById(
        "redo-button-v2"
      );

  }


  if (
    !button
  ) {

    return;

  }


  button.hidden =
    redoHistoryV2.length
    ===
    0;

}


/* ========================================
   通知
======================================== */

let undoToastTimerV2 =
  null;


function showUndoToastV2(
  message
) {

  let toast =
    document.getElementById(
      "undo-toast-v2"
    );


  if (
    !toast
  ) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "undo-toast-v2";


    toast.className =
      "undo-toast";


    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    undoToastTimerV2
  );


  undoToastTimerV2 =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2000
    );

}


/* ========================================
   Overlayを閉じる
======================================== */

function closeUndoOverlayV2() {

  const overlay =
    document.getElementById(
      "undo-history-overlay-v2"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


/* ========================================
   初期化
======================================== */

function initUndoRedoV2() {

  /*
    古いRedoボタンを消す
  */

  const oldRedo =
    document.getElementById(
      "redo-button-v1"
    );


  if (
    oldRedo
  ) {

    oldRedo.remove();

  }


  createRedoButtonV2();

}


/*
  HTML読込状況に関係なく初期化
*/

if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initUndoRedoV2
  );

} else {

  initUndoRedoV2();

}
/* ========================================
   Undoボタン 強制有効化
======================================== */

function forceEnableUndoButton() {

  const candidates =
    Array.from(
      document.querySelectorAll(
        "button, [role='button'], div, span"
      )
    );


  const undoButton =
    candidates.find(
      (element) =>
        element.textContent.trim()
        === "Undo"
    );


  if (
    !undoButton
  ) {

    console.log(
      "Undoボタンが見つかりません"
    );

    return;

  }


  /*
    disabledを解除
  */

  if (
    "disabled"
    in undoButton
  ) {

    undoButton.disabled =
      false;

  }


  undoButton.removeAttribute(
    "disabled"
  );


  undoButton.removeAttribute(
    "aria-disabled"
  );


  undoButton.style.pointerEvents =
    "auto";


  undoButton.style.cursor =
    "pointer";


  /*
    既存処理に依存せず
    Undo画面を直接開く
  */

  undoButton.onclick =
    (event) => {

      event.preventDefault();

      event.stopPropagation();

      openUndoHistoryV2();

    };


  console.log(
    "Undoボタン接続完了"
  );

}


/*
  読み込み後に確実に実行
*/

if (
  document.readyState
  === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    forceEnableUndoButton
  );

} else {

  forceEnableUndoButton();

}


/*
  念のため少し遅れてもう一度
*/

setTimeout(
  forceEnableUndoButton,
  300
);
/* ========================================
   端末保存・復旧 Ver.1
   確定済み対局状態
======================================== */

const LOCAL_MATCH_SAVE_KEY_V1 =
  "MahjongScoreApp_match_v1";


let lastLocalSaveHashV1 =
  "";


/* ========================================
   現在対局中か
======================================== */

function isGameActiveForLocalSaveV1() {

  return (
    gameScreen
    &&
    gameScreen.classList.contains(
      "active"
    )
  );

}


/* ========================================
   保存用データを作る
======================================== */

function buildLocalMatchSaveV1() {

  return {

    version:
      1,

    currentPlayers: {
      ...currentPlayers
    },

    dealerPosition,

    initialRanks: {
      ...initialRanks
    },

    gameState: {

      scores: {
        ...gameState.scores
      },

      riichi: {
        ...gameState.riichi
      },

      kyotaku:
        gameState.kyotaku,

      honba:
        gameState.honba,

      roundWind:
        gameState.roundWind,

      handNumber:
        gameState.handNumber

    }

  };

}


/* ========================================
   保存
======================================== */

function saveLocalMatchV1() {

  if (
    !isGameActiveForLocalSaveV1()
  ) {

    return;

  }


  const data =
    buildLocalMatchSaveV1();


  const hash =
    JSON.stringify(
      data
    );


  /*
    状態が変わっていなければ
    無駄に保存しない
  */

  if (
    hash ===
    lastLocalSaveHashV1
  ) {

    return;

  }


  try {

    const saveData = {

      ...data,

      savedAt:
        new Date()
          .toISOString()

    };


    localStorage.setItem(
      LOCAL_MATCH_SAVE_KEY_V1,
      JSON.stringify(
        saveData
      )
    );


    lastLocalSaveHashV1 =
      hash;


    console.log(
      "対局状態を端末保存しました"
    );

  } catch (
    error
  ) {

    console.error(
      "端末保存に失敗しました",
      error
    );


    if (
      typeof showUndoToastV2
      ===
      "function"
    ) {

      showUndoToastV2(
        "端末保存に失敗しました"
      );

    }

  }

}


/* ========================================
   保存データの最低限チェック
======================================== */

function isValidLocalMatchSaveV1(
  data
) {

  if (
    !data
    ||
    data.version !== 1
  ) {

    return false;

  }


  if (
    !data.currentPlayers
    ||
    !data.gameState
    ||
    !data.gameState.scores
  ) {

    return false;

  }


  const playerNames =
    positions.map(
      (position) =>
        data.currentPlayers[
          position
        ]
    );


  if (
    playerNames.some(
      (name) =>
        typeof name !== "string"
        ||
        name.trim() === ""
    )
  ) {

    return false;

  }


  return true;

}


/* ========================================
   対局状態を復旧
======================================== */

function restoreLocalMatchV1() {

  let rawData =
    null;


  try {

    rawData =
      localStorage.getItem(
        LOCAL_MATCH_SAVE_KEY_V1
      );

  } catch (
    error
  ) {

    console.error(
      "保存データを読み込めませんでした",
      error
    );


    return false;

  }


  if (
    !rawData
  ) {

    return false;

  }


  let data =
    null;


  try {

    data =
      JSON.parse(
        rawData
      );

  } catch (
    error
  ) {

    console.error(
      "保存データが壊れています",
      error
    );


    return false;

  }


  if (
    !isValidLocalMatchSaveV1(
      data
    )
  ) {

    return false;

  }


  /*
    プレイヤー
  */

  currentPlayers = {
    ...data.currentPlayers
  };


  /*
    親
  */

  dealerPosition =
    data.dealerPosition;


  /*
    起家基準順位
  */

  initialRanks = {

    ...(data.initialRanks || {})

  };


  /*
    点数
  */

  positions.forEach(
    (position) => {

      const savedScore =
        data.gameState
          .scores[position];


      if (
        typeof savedScore
        ===
        "number"
      ) {

        gameState.scores[
          position
        ] =
          savedScore;

      }


      gameState.riichi[
        position
      ] =
        Boolean(
          data.gameState
            .riichi
            ?.[
              position
            ]
        );

    }
  );


  /*
    供託・本場
  */

  gameState.kyotaku =
    Number(
      data.gameState.kyotaku
      || 0
    );


  gameState.honba =
    Number(
      data.gameState.honba
      || 0
    );


  /*
    局
  */

  gameState.roundWind =
    data.gameState.roundWind
    || "東";


  gameState.handNumber =
    Number(
      data.gameState.handNumber
      || 1
    );


  /*
    名前表示
  */

  positions.forEach(
    (position) => {

      const nameElement =
        document.getElementById(
          `game-name-${position}`
        );


      if (
        nameElement
      ) {

        nameElement.textContent =
          currentPlayers[
            position
          ];

      }

    }
  );


  /*
    親・席風
  */

  if (
    typeof updateDealerAndSeatWinds
    ===
    "function"
  ) {

    updateDealerAndSeatWinds();

  }


  /*
    局表示
  */

  if (
    typeof updateRoundDisplay
    ===
    "function"
  ) {

    updateRoundDisplay();

  }


  /*
    アガリ画面は閉じておく
  */

  agariFlow.active =
    false;


  agariFlow.committed =
    false;


  agariOverlay
    .classList
    .add(
      "hidden"
    );


  agariCancelButton.style.display =
    "";


  /*
    流局画面も閉じる
  */

  const ryuukyokuOverlay =
    document.getElementById(
      "ryuukyoku-flow-overlay"
    );


  if (
    ryuukyokuOverlay
  ) {

    ryuukyokuOverlay.style.display =
      "none";

  }


  ryuukyokuFlowV1.active =
    false;


  /*
    設定・確認画面を消して
    対局画面へ
  */

  setupScreen
    .classList
    .remove(
      "active"
    );


  confirmScreen
    .classList
    .remove(
      "active"
    );


  gameScreen
    .classList
    .add(
      "active"
    );


  /*
    全表示更新
  */

  updateGameUI();


  updateRoundDisplay();


  /*
    現在状態を保存済みとして扱う
  */

  lastLocalSaveHashV1 =
    JSON.stringify(
      buildLocalMatchSaveV1()
    );


  console.log(
    "対局状態を復旧しました"
  );


  /*
    復旧成功を呼び出し元へ返す。
    クラウド参加処理が成功判定できるようにする。
  */
  const restoreSucceededV4 = true;


  /*
    上中央に通知
  */

  setTimeout(
    () => {

      if (
        typeof showUndoToastV2
        ===
        "function"
      ) {

        showUndoToastV2(
          "対局データを復旧しました"
        );

      }

    },
    200
  );


  return true;

}


/* ========================================
   自動保存
======================================== */

/*
  300msごとに状態を見る。

  実際に変化した時だけ
  localStorageへ保存する。
*/

setInterval(
  () => {

    saveLocalMatchV1();

  },
  300
);


/* ========================================
   Safariを閉じる直前にも保存
======================================== */

window.addEventListener(
  "beforeunload",
  () => {

    /*
      強制的に最新状態を保存するため
      ハッシュを一度空にする
    */

    lastLocalSaveHashV1 =
      "";


    saveLocalMatchV1();

  }
);


/* ========================================
   起動時に復旧
======================================== */

function initLocalMatchRestoreV1() {

  restoreLocalMatchV1();

}


if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initLocalMatchRestoreV1
  );

} else {

  initLocalMatchRestoreV1();

}
/* ========================================
   入力途中保存・復旧 Ver.1
======================================== */

const LOCAL_DRAFT_SAVE_KEY_V1 =
  "MahjongScoreApp_draft_v1";


let lastDraftHashV1 =
  "";


let draftRestoreDecisionV1 =
  false;


/* ========================================
   アガリ入力を保存用に変換
======================================== */

function buildAgariDraftV1() {

  if (
    !agariFlow.active
  ) {

    return null;

  }


  return {

    type:
      "agari",

    data: {

      step:
        agariFlow.step,

      agariType:
        agariFlow.type,

      winners: [
        ...agariFlow.winners
      ],

      discarder:
        agariFlow.discarder,

      addingWinner:
        agariFlow.addingWinner,

      currentWinnerIndex:
        agariFlow.currentWinnerIndex,

      currentScoreSelection:
        agariFlow.currentScoreSelection,

      scoreResults:
        agariFlow.scoreResults,

      showHighFu:
        agariFlow.showHighFu,

      pendingMovement:
        agariFlow.pendingMovement
        || null,

      committed:
        Boolean(
          agariFlow.committed
        )

    }

  };

}


/* ========================================
   流局入力を保存用に変換
======================================== */

function buildRyuukyokuDraftV1() {

  if (
    !ryuukyokuFlowV1.active
  ) {

    return null;

  }


  return {

    type:
      "ryuukyoku",

    data: {

      stage:
        ryuukyokuFlowV1.stage,

      tenpaiPlayers:
        Array.from(
          ryuukyokuFlowV1
            .tenpaiPlayers
        ),

      movement:
        ryuukyokuFlowV1.movement,

      dealerTenpai:
        ryuukyokuFlowV1.dealerTenpai,

      committed:
        Boolean(
          ryuukyokuFlowV1.committed
        )

    }

  };

}


/* ========================================
   入力途中を保存
======================================== */

function saveInputDraftV1() {

  if (
    draftRestoreDecisionV1
  ) {

    return;

  }


  let draft =
    null;


  if (
    agariFlow.active
  ) {

    draft =
      buildAgariDraftV1();

  } else if (
    ryuukyokuFlowV1.active
  ) {

    draft =
      buildRyuukyokuDraftV1();

  }


  /*
    入力途中ではないなら
    古い下書きを削除
  */

  if (
    !draft
  ) {

    if (
      lastDraftHashV1 !== ""
    ) {

      localStorage.removeItem(
        LOCAL_DRAFT_SAVE_KEY_V1
      );


      lastDraftHashV1 =
        "";

    }


    return;

  }


  const saveData = {

    version:
      1,

    savedAt:
      new Date()
        .toISOString(),

    ...draft

  };


  const hash =
    JSON.stringify(
      saveData
    );


  if (
    hash ===
    lastDraftHashV1
  ) {

    return;

  }


  try {

    localStorage.setItem(
      LOCAL_DRAFT_SAVE_KEY_V1,
      hash
    );


    lastDraftHashV1 =
      hash;

  } catch (
    error
  ) {

    console.error(
      "入力途中データの保存に失敗しました",
      error
    );

  }

}


/* ========================================
   保存された途中入力を読む
======================================== */

function readInputDraftV1() {

  let raw =
    null;


  try {

    raw =
      localStorage.getItem(
        LOCAL_DRAFT_SAVE_KEY_V1
      );

  } catch (
    error
  ) {

    return null;

  }


  if (
    !raw
  ) {

    return null;

  }


  try {

    const data =
      JSON.parse(
        raw
      );


    if (
      !data
      ||
      data.version !== 1
      ||
      !data.type
      ||
      !data.data
    ) {

      return null;

    }


    return data;

  } catch (
    error
  ) {

    return null;

  }

}


/* ========================================
   復旧確認画面
======================================== */

function showDraftRestoreDialogV1(
  draft
) {

  draftRestoreDecisionV1 =
    true;


  const old =
    document.getElementById(
      "draft-restore-overlay-v1"
    );


  if (
    old
  ) {

    old.remove();

  }


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "draft-restore-overlay-v1";


  overlay.className =
    "draft-restore-overlay";


  const draftName =
    draft.type === "agari"
      ? "アガリ入力"
      : "流局入力";


  overlay.innerHTML = `

    <div class="draft-restore-card">

      <h2>
        入力途中のデータがあります
      </h2>


      <p>

        ${
          escapeHtml(
            draftName
          )
        }の途中で終了しています。

        <br>

        続きから再開しますか？

      </p>


      <div class="draft-restore-buttons">

        <button
          id="draft-discard-button-v1"
          class="draft-discard-button"
        >
          破棄
        </button>


        <button
          id="draft-continue-button-v1"
          class="draft-continue-button"
        >
          続きから再開
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  document
    .getElementById(
      "draft-discard-button-v1"
    )
    .onclick =
    () => {

      discardInputDraftV1();

    };


  document
    .getElementById(
      "draft-continue-button-v1"
    )
    .onclick =
    () => {

      restoreInputDraftV1(
        draft
      );

    };

}


/* ========================================
   下書きを破棄
======================================== */

function discardInputDraftV1() {

  localStorage.removeItem(
    LOCAL_DRAFT_SAVE_KEY_V1
  );


  lastDraftHashV1 =
    "";


  draftRestoreDecisionV1 =
    false;


  const overlay =
    document.getElementById(
      "draft-restore-overlay-v1"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }


  if (
    typeof showUndoToastV2
    ===
    "function"
  ) {

    showUndoToastV2(
      "入力途中のデータを破棄しました"
    );

  }

}


/* ========================================
   下書きを復旧
======================================== */

function restoreInputDraftV1(
  draft
) {

  const overlay =
    document.getElementById(
      "draft-restore-overlay-v1"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }


  if (
    draft.type === "agari"
  ) {

    restoreAgariDraftV1(
      draft.data
    );

  }


  if (
    draft.type === "ryuukyoku"
  ) {

    restoreRyuukyokuDraftV1(
      draft.data
    );

  }


  draftRestoreDecisionV1 =
    false;


  lastDraftHashV1 =
    "";


  if (
    typeof showUndoToastV2
    ===
    "function"
  ) {

    showUndoToastV2(
      "入力途中から再開しました"
    );

  }

}


/* ========================================
   アガリ入力復旧
======================================== */

function restoreAgariDraftV1(
  data
) {

  agariFlow.active =
    true;


  agariFlow.step =
    data.step;


  agariFlow.type =
    data.agariType;


  agariFlow.winners =
    Array.isArray(
      data.winners
    )
      ? [
          ...data.winners
        ]
      : [];


  agariFlow.discarder =
    data.discarder
    || null;


  agariFlow.addingWinner =
    Boolean(
      data.addingWinner
    );


  agariFlow.currentWinnerIndex =
    Number(
      data.currentWinnerIndex
      || 0
    );


  agariFlow.currentScoreSelection =
    data.currentScoreSelection
    || null;


  agariFlow.scoreResults =
    data.scoreResults
    || {};


  agariFlow.showHighFu =
    Boolean(
      data.showHighFu
    );


  agariFlow.pendingMovement =
    data.pendingMovement
    || null;


  agariFlow.committed =
    Boolean(
      data.committed
    );


  agariOverlay
    .classList
    .remove(
      "hidden"
    );


  /*
    確定済みなら
    次局ボタンの画面へ戻す
  */

  if (
    agariFlow.committed
  ) {

    renderAppliedAgariResult();

    return;

  }


  /*
    勝者選択
  */

  if (
    agariFlow.step
    === "winner"
  ) {

    setPlayerSelectionMode(
      true
    );


    updateWinnerHighlights();

  }


  /*
    放銃者選択
  */

  if (
    agariFlow.step
    === "discarder"
  ) {

    setPlayerSelectionMode(
      true
    );


    updateWinnerHighlights();


    if (
      agariFlow.discarder
    ) {

      document
        .getElementById(
          `panel-${
            agariFlow.discarder
          }`
        )
        .classList
        .add(
          "discarder-player"
        );

    }

  }


  /*
    点数入力など
  */

  renderAgariFlow();


  updateGameUI();

}


/* ========================================
   流局入力復旧
======================================== */

function restoreRyuukyokuDraftV1(
  data
) {

  ryuukyokuFlowV1.active =
    true;


  ryuukyokuFlowV1.stage =
    data.stage
    || "select";


  ryuukyokuFlowV1.tenpaiPlayers =
    new Set(
      Array.isArray(
        data.tenpaiPlayers
      )
        ? data.tenpaiPlayers
        : []
    );


  ryuukyokuFlowV1.movement =
    data.movement
    || null;


  ryuukyokuFlowV1.dealerTenpai =
    Boolean(
      data.dealerTenpai
    );


  ryuukyokuFlowV1.committed =
    Boolean(
      data.committed
    );


  const overlay =
    getRyuukyokuOverlayV1();


  overlay.style.display =
    "block";


  /*
    点数確定後
  */

  if (
    ryuukyokuFlowV1.committed
    ||
    ryuukyokuFlowV1.stage
      === "applied"
  ) {

    renderRyuukyokuAppliedV1();

    return;

  }


  /*
    結果確認画面
  */

  if (
    ryuukyokuFlowV1.stage
      === "preview"
  ) {

    refreshRyuukyokuPlayerSelectionV1();


    renderRyuukyokuResultPreviewV1();

    return;

  }


  /*
    テンパイ選択
  */

  ryuukyokuFlowV1.stage =
    "select";


  refreshRyuukyokuPlayerSelectionV1();


  renderRyuukyokuSelectionV1();

}


/* ========================================
   起動時チェック
======================================== */

function initInputDraftRestoreV1() {

  const draft =
    readInputDraftV1();


  if (
    !draft
  ) {

    return;

  }


  showDraftRestoreDialogV1(
    draft
  );

}


/* ========================================
   約1秒ごとに途中状態保存
======================================== */

setInterval(
  saveInputDraftV1,
  1000
);


/* ========================================
   Safari終了直前にも保存
======================================== */

window.addEventListener(
  "beforeunload",
  () => {

    lastDraftHashV1 =
      "";


    saveInputDraftV1();

  }
);


/* ========================================
   起動
======================================== */

if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      /*
        確定済み対局の復旧を
        先に終わらせてから
        入力途中を確認
      */

      setTimeout(
        initInputDraftRestoreV1,
        100
      );

    }
  );

} else {

  setTimeout(
    initInputDraftRestoreV1,
    100
  );

}
/* ========================================
   点数修正 Ver.1
======================================== */

const pointCorrectionV1 = {

  active: false,

  player:
    null,

  mode:
    null

};


/* ========================================
   ︙ボタン取得
======================================== */

function findGameMenuButtonV1() {

  return Array
    .from(
      document.querySelectorAll(
        "button, [role='button']"
      )
    )
    .find(
      (element) => {

        const text =
          element
            .textContent
            .trim();


        return (
          text === "⋮"
          ||
          text === "︙"
          ||
          text === "..."
        );

      }
    )
    || null;

}


/* ========================================
   簡易メニュー
======================================== */

function openSimpleGameMenuV1() {

  closeSimpleGameMenuV1();


  const menu =
    document.createElement(
      "div"
    );


  menu.id =
    "simple-game-menu-v1";


  menu.className =
    "simple-game-menu";


  menu.innerHTML = `

    <button
      type="button"
      id="open-point-correction-v1"
    >
      点数修正
    </button>


    <button
      type="button"
      id="close-simple-menu-v1"
    >
      閉じる
    </button>
  `;


  document.body.appendChild(
    menu
  );


  document
    .getElementById(
      "open-point-correction-v1"
    )
    .onclick =
    () => {

      closeSimpleGameMenuV1();

      startPointCorrectionV1();

    };


  document
    .getElementById(
      "close-simple-menu-v1"
    )
    .onclick =
    closeSimpleGameMenuV1;

}


function closeSimpleGameMenuV1() {

  const menu =
    document.getElementById(
      "simple-game-menu-v1"
    );


  if (
    menu
  ) {

    menu.remove();

  }

}


/* ========================================
   点数修正開始
======================================== */

function startPointCorrectionV1() {

  pointCorrectionV1.active =
    true;


  pointCorrectionV1.player =
    null;


  pointCorrectionV1.mode =
    null;


  renderPointCorrectionPlayerSelectionV1();

}


/* ========================================
   修正用オーバーレイ
======================================== */

function getPointCorrectionOverlayV1() {

  let overlay =
    document.getElementById(
      "point-correction-overlay-v1"
    );


  if (
    overlay
  ) {

    return overlay;

  }


  overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "point-correction-overlay-v1";


  overlay.className =
    "point-correction-overlay";


  document.body.appendChild(
    overlay
  );


  return overlay;

}


/* ========================================
   プレイヤー選択
======================================== */

function renderPointCorrectionPlayerSelectionV1() {

  const overlay =
    getPointCorrectionOverlayV1();


  overlay.innerHTML = `

    <h2>
      点数修正
    </h2>


    <p class="point-correction-description">

      修正するプレイヤーの
      パネルをタップしてください

    </p>


    <div class="point-correction-actions">

      <button
        type="button"
        id="point-correction-cancel-v1"
        class="point-correction-back"
      >
        キャンセル
      </button>

    </div>
  `;


  document
    .getElementById(
      "point-correction-cancel-v1"
    )
    .onclick =
    closePointCorrectionV1;

}


/* ========================================
   プレイヤーパネルを横取り
======================================== */

positions.forEach(
  (position) => {

    const panel =
      document.getElementById(
        `panel-${position}`
      );


    if (
      !panel
    ) {

      return;

    }


    panel.addEventListener(
      "click",
      (event) => {

        if (
          !pointCorrectionV1.active
          ||
          pointCorrectionV1.player
        ) {

          return;

        }


        event.preventDefault();

        event.stopPropagation();

        event.stopImmediatePropagation();


        selectPointCorrectionPlayerV1(
          position
        );

      },
      true
    );

  }
);


/* ========================================
   プレイヤー決定
======================================== */

function selectPointCorrectionPlayerV1(
  position
) {

  pointCorrectionV1.player =
    position;


  positions.forEach(
    (item) => {

      document
        .getElementById(
          `panel-${item}`
        )
        .classList
        .toggle(
          "point-correction-player-selected",
          item === position
        );

    }
  );


  renderPointCorrectionModeV1();

}


/* ========================================
   修正方法
======================================== */

function renderPointCorrectionModeV1() {

  const position =
    pointCorrectionV1.player;


  const overlay =
    getPointCorrectionOverlayV1();


  overlay.innerHTML = `

    <h2>
      ${
        escapeHtml(
          currentPlayers[
            position
          ]
        )
      } の点数修正
    </h2>


    <p class="point-correction-description">

      現在
      ${
        gameState
          .scores[
            position
          ]
          .toLocaleString(
            "ja-JP"
          )
      }点

    </p>


    <div class="point-correction-mode-grid">

      <button
        type="button"
        id="point-correction-set-v1"
      >
        現在点を
        <br>
        直接設定
      </button>


      <button
        type="button"
        id="point-correction-delta-v1"
      >
        差分を
        <br>
        加減
      </button>

    </div>


    <div class="point-correction-actions">

      <button
        type="button"
        id="point-correction-player-back-v1"
        class="point-correction-back"
      >
        戻る
      </button>

    </div>
  `;


  document
    .getElementById(
      "point-correction-set-v1"
    )
    .onclick =
    () => {

      pointCorrectionV1.mode =
        "set";


      renderPointCorrectionInputV1();

    };


  document
    .getElementById(
      "point-correction-delta-v1"
    )
    .onclick =
    () => {

      pointCorrectionV1.mode =
        "delta";


      renderPointCorrectionInputV1();

    };


  document
    .getElementById(
      "point-correction-player-back-v1"
    )
    .onclick =
    () => {

      pointCorrectionV1.player =
        null;


      clearPointCorrectionHighlightV1();


      renderPointCorrectionPlayerSelectionV1();

    };

}


/* ========================================
   数値入力
======================================== */

function renderPointCorrectionInputV1() {

  const position =
    pointCorrectionV1.player;


  const currentScore =
    gameState.scores[
      position
    ];


  const isSet =
    pointCorrectionV1.mode
    ===
    "set";


  const overlay =
    getPointCorrectionOverlayV1();


  overlay.innerHTML = `

    <h2>
      点数修正
    </h2>


    <p class="point-correction-description">

      ${
        escapeHtml(
          currentPlayers[
            position
          ]
        )
      }

      ／

      現在
      ${
        currentScore
          .toLocaleString(
            "ja-JP"
          )
      }点

    </p>


    <div class="point-correction-field">

      <label>

        ${
          isSet
            ?
            "新しい持ち点"
            :
            "加減する点数"
        }

      </label>


      <input
        id="point-correction-input-v1"
        type="number"
        inputmode="numeric"

        placeholder="${
          isSet
            ?
            "例：28000"
            :
            "例：1000 または -1000"
        }"
      >

    </div>


    <p
      id="point-correction-error-v1"
      class="point-correction-error"
    ></p>


    <div class="point-correction-actions">

      <button
        type="button"
        id="point-correction-input-back-v1"
        class="point-correction-back"
      >
        戻る
      </button>


      <button
        type="button"
        id="point-correction-preview-v1"
        class="point-correction-next"
      >
        確認
      </button>

    </div>
  `;


  document
    .getElementById(
      "point-correction-input-back-v1"
    )
    .onclick =
    renderPointCorrectionModeV1;


  document
    .getElementById(
      "point-correction-preview-v1"
    )
    .onclick =
    buildPointCorrectionPreviewV1;

}


/* ========================================
   確認画面
======================================== */

function buildPointCorrectionPreviewV1() {

  const input =
    document.getElementById(
      "point-correction-input-v1"
    );


  const error =
    document.getElementById(
      "point-correction-error-v1"
    );


  const value =
    Number(
      input.value
    );


  if (
    !Number.isInteger(
      value
    )
  ) {

    error.textContent =
      "整数で入力してください。";

    return;

  }


  const position =
    pointCorrectionV1.player;


  const currentScore =
    gameState.scores[
      position
    ];


  let newScore =
    currentScore;


  if (
    pointCorrectionV1.mode
    ===
    "set"
  ) {

    newScore =
      value;

  } else {

    newScore =
      currentScore
      +
      value;

  }


  const delta =
    newScore
    -
    currentScore;


  renderPointCorrectionPreviewV1(
    currentScore,
    newScore,
    delta
  );

}


/* ========================================
   修正内容表示
======================================== */

function renderPointCorrectionPreviewV1(
  currentScore,
  newScore,
  delta
) {

  const position =
    pointCorrectionV1.player;


  const overlay =
    getPointCorrectionOverlayV1();


  let deltaText =
    "±0";


  let deltaClass =
    "";


  if (
    delta > 0
  ) {

    deltaText =
      `+${
        delta.toLocaleString(
          "ja-JP"
        )
      }`;


    deltaClass =
      "point-correction-delta-plus";

  }


  if (
    delta < 0
  ) {

    deltaText =
      delta.toLocaleString(
        "ja-JP"
      );


    deltaClass =
      "point-correction-delta-minus";

  }


  overlay.innerHTML = `

    <h2>
      修正内容の確認
    </h2>


    <div class="point-correction-preview">

      <strong>

        ${
          escapeHtml(
            currentPlayers[
              position
            ]
          )
        }

      </strong>


      ${
        currentScore.toLocaleString(
          "ja-JP"
        )
      }

      →

      ${
        newScore.toLocaleString(
          "ja-JP"
        )
      }点


      <br>


      <span class="${deltaClass}">

        ${deltaText}

      </span>

    </div>


    <div class="point-correction-actions">

      <button
        type="button"
        id="point-correction-preview-back-v1"
        class="point-correction-back"
      >
        戻る
      </button>


      <button
        type="button"
        id="point-correction-confirm-v1"
        class="point-correction-confirm"
      >
        確定
      </button>

    </div>
  `;


  document
    .getElementById(
      "point-correction-preview-back-v1"
    )
    .onclick =
    renderPointCorrectionInputV1;


  document
    .getElementById(
      "point-correction-confirm-v1"
    )
    .onclick =
    () => {

      confirmPointCorrectionV1(
        newScore,
        delta
      );

    };

}


/* ========================================
   点数修正确定
======================================== */

function confirmPointCorrectionV1(
  newScore,
  delta
) {

  const position =
    pointCorrectionV1.player;


  /*
    Undo用：変更前
  */

  const before =
    captureGameStateV2();


  gameState.scores[
    position
  ] =
    newScore;


  updateGameUI();


  /*
    Undo用：変更後
  */

  const after =
    captureGameStateV2();


  addUndoHistoryV2(

    `点数修正・${
      currentPlayers[
        position
      ]
    } ${
      delta > 0
        ?
        "+"
        :
        ""
    }${
      delta.toLocaleString(
        "ja-JP"
      )
    }`,

    before,

    after

  );


  showScoreDelta(
    position,
    delta
  );


  closePointCorrectionV1();


  if (
    typeof showUndoToastV2
    ===
    "function"
  ) {

    showUndoToastV2(
      "点数を修正しました"
    );

  }

}


/* ========================================
   ハイライト解除
======================================== */

function clearPointCorrectionHighlightV1() {

  positions.forEach(
    (position) => {

      document
        .getElementById(
          `panel-${position}`
        )
        .classList
        .remove(
          "point-correction-player-selected"
        );

    }
  );

}


/* ========================================
   点数修正終了
======================================== */

function closePointCorrectionV1() {

  pointCorrectionV1.active =
    false;


  pointCorrectionV1.player =
    null;


  pointCorrectionV1.mode =
    null;


  clearPointCorrectionHighlightV1();


  const overlay =
    document.getElementById(
      "point-correction-overlay-v1"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


/* ========================================
   ︙を接続
======================================== */

function initSimpleGameMenuV1() {

  const menuButton =
    findGameMenuButtonV1();


  if (
    !menuButton
  ) {

    return;

  }


  menuButton.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      const existing =
        document.getElementById(
          "simple-game-menu-v1"
        );


      if (
        existing
      ) {

        closeSimpleGameMenuV1();

      } else {

        openSimpleGameMenuV1();

      }

    },
    true
  );

}


/* ========================================
   起動
======================================== */

if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initSimpleGameMenuV1
  );

} else {

  initSimpleGameMenuV1();

}
/* ========================================
   点数修正 差分＋ / − Ver.2
======================================== */

pointCorrectionV1.deltaSign =
  1;


/*
  「差分を加減」を選んだ瞬間は
  ＋を初期値にする
*/

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "#point-correction-delta-v1"
      );


    if (
      button
    ) {

      pointCorrectionV1.deltaSign =
        1;

    }

  },
  true
);


/* ========================================
   ＋ / − ボタン表示更新
======================================== */

function updatePointCorrectionSignButtonsV2() {

  const plusButton =
    document.getElementById(
      "point-correction-plus-v2"
    );


  const minusButton =
    document.getElementById(
      "point-correction-minus-v2"
    );


  if (
    !plusButton
    ||
    !minusButton
  ) {

    return;

  }


  plusButton.classList.toggle(
    "active",
    pointCorrectionV1.deltaSign
      === 1
  );


  minusButton.classList.toggle(
    "active",
    pointCorrectionV1.deltaSign
      === -1
  );

}


/* ========================================
   数値入力画面 Ver.2
======================================== */

function renderPointCorrectionInputV1() {

  const position =
    pointCorrectionV1.player;


  const currentScore =
    gameState.scores[
      position
    ];


  const isSet =
    pointCorrectionV1.mode
    ===
    "set";


  const overlay =
    getPointCorrectionOverlayV1();


  const signButtons =
    isSet
      ?
      ""
      :
      `

        <div class="point-correction-sign-row">

          <button
            type="button"
            id="point-correction-plus-v2"
            class="
              point-correction-sign-button
              ${
                pointCorrectionV1.deltaSign
                  === 1
                  ? "active"
                  : ""
              }
            "
          >
            ＋
          </button>


          <button
            type="button"
            id="point-correction-minus-v2"
            class="
              point-correction-sign-button
              ${
                pointCorrectionV1.deltaSign
                  === -1
                  ? "active"
                  : ""
              }
            "
          >
            −
          </button>

        </div>
      `;


  overlay.innerHTML = `

    <h2>
      点数修正
    </h2>


    <p class="point-correction-description">

      ${
        escapeHtml(
          currentPlayers[
            position
          ]
        )
      }

      ／

      現在
      ${
        currentScore
          .toLocaleString(
            "ja-JP"
          )
      }点

    </p>


    ${signButtons}


    <div class="point-correction-field">

      <label>

        ${
          isSet
            ?
            "新しい持ち点"
            :
            "加減する点数"
        }

      </label>


      <input
        id="point-correction-input-v1"
        type="number"

        inputmode="${
          isSet
            ? "numeric"
            : "numeric"
        }"

        ${
          isSet
            ? ""
            : 'min="0"'
        }

        placeholder="${
          isSet
            ?
            "例：28000"
            :
            "例：1000"
        }"
      >

    </div>


    <p
      id="point-correction-error-v1"
      class="point-correction-error"
    ></p>


    <div class="point-correction-actions">

      <button
        type="button"
        id="point-correction-input-back-v1"
        class="point-correction-back"
      >
        戻る
      </button>


      <button
        type="button"
        id="point-correction-preview-v1"
        class="point-correction-next"
      >
        確認
      </button>

    </div>
  `;


  const plusButton =
    document.getElementById(
      "point-correction-plus-v2"
    );


  const minusButton =
    document.getElementById(
      "point-correction-minus-v2"
    );


  if (
    plusButton
  ) {

    plusButton.onclick =
      () => {

        pointCorrectionV1.deltaSign =
          1;


        updatePointCorrectionSignButtonsV2();

      };

  }


  if (
    minusButton
  ) {

    minusButton.onclick =
      () => {

        pointCorrectionV1.deltaSign =
          -1;


        updatePointCorrectionSignButtonsV2();

      };

  }


  document
    .getElementById(
      "point-correction-input-back-v1"
    )
    .onclick =
    renderPointCorrectionModeV1;


  document
    .getElementById(
      "point-correction-preview-v1"
    )
    .onclick =
    buildPointCorrectionPreviewV1;

}


/* ========================================
   確認計算 Ver.2
======================================== */

function buildPointCorrectionPreviewV1() {

  const input =
    document.getElementById(
      "point-correction-input-v1"
    );


  const error =
    document.getElementById(
      "point-correction-error-v1"
    );


  const value =
    Number(
      input.value
    );


  if (
    !Number.isInteger(
      value
    )
  ) {

    error.textContent =
      "整数で入力してください。";

    return;

  }


  const position =
    pointCorrectionV1.player;


  const currentScore =
    gameState.scores[
      position
    ];


  let newScore =
    currentScore;


  /*
    現在点を直接設定
  */

  if (
    pointCorrectionV1.mode
    ===
    "set"
  ) {

    newScore =
      value;

  }


  /*
    差分を加減
  */

  if (
    pointCorrectionV1.mode
    ===
    "delta"
  ) {

    if (
      value < 0
    ) {

      error.textContent =
        "＋ / −ボタンを選び、数字だけ入力してください。";

      return;

    }


    const signedValue =
      value
      *
      pointCorrectionV1.deltaSign;


    newScore =
      currentScore
      +
      signedValue;

  }


  const delta =
    newScore
    -
    currentScore;


  renderPointCorrectionPreviewV1(
    currentScore,
    newScore,
    delta
  );

}
/* ========================================
   対局終了・最終結果 Ver.1
======================================== */

const FINISHED_MATCH_KEY_V1 =
  "MahjongScoreApp_finished_v1";


let dealerSelectionRequiredV1 =
  false;


/* ========================================
   メニュー Ver.2
======================================== */

function openSimpleGameMenuV1() {

  closeSimpleGameMenuV1();


  const menu =
    document.createElement(
      "div"
    );


  menu.id =
    "simple-game-menu-v1";


  menu.className =
    "simple-game-menu";


  menu.innerHTML = `

    <button
      type="button"
      id="open-point-correction-v1"
    >
      点数修正
    </button>


    <button
      type="button"
      id="open-match-end-v1"
    >
      対局を終了
    </button>


    <button
      type="button"
      id="close-simple-menu-v1"
    >
      閉じる
    </button>
  `;


  document.body.appendChild(
    menu
  );


  document
    .getElementById(
      "open-point-correction-v1"
    )
    .onclick =
    () => {

      closeSimpleGameMenuV1();

      startPointCorrectionV1();

    };


  document
    .getElementById(
      "open-match-end-v1"
    )
    .onclick =
    () => {

      closeSimpleGameMenuV1();

      openMatchEndDialogV1();

    };


  document
    .getElementById(
      "close-simple-menu-v1"
    )
    .onclick =
    closeSimpleGameMenuV1;

}


/* ========================================
   終了確認
======================================== */

function openMatchEndDialogV1() {

  closeMatchEndDialogV1();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "match-end-overlay-v1";


  overlay.className =
    "match-end-overlay-v1";


  overlay.innerHTML = `

    <div class="match-end-card-v1">

      <h2>
        対局を終了しますか？
      </h2>


      <p>

        ${
          escapeHtml(
            getRoundName()
          )
        }

        ・

        ${
          gameState.honba
        }本場

        <br>

        現在の点数を結果として
        残すこともできます。

      </p>


      <div class="match-end-actions-v1">

        <button
          type="button"
          id="match-end-save-v1"
          class="match-end-save-v1"
        >
          結果を残して終了
        </button>


        <button
          type="button"
          id="match-end-discard-v1"
          class="match-end-discard-v1"
        >
          破棄して終了
        </button>


        <button
          type="button"
          id="match-end-back-v1"
          class="match-end-back-v1"
        >
          戻る
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  document
    .getElementById(
      "match-end-save-v1"
    )
    .onclick =
    finishMatchAndKeepResultV1;


  document
    .getElementById(
      "match-end-discard-v1"
    )
    .onclick =
    finishMatchAndDiscardV1;


  document
    .getElementById(
      "match-end-back-v1"
    )
    .onclick =
    closeMatchEndDialogV1;

}


function closeMatchEndDialogV1() {

  const overlay =
    document.getElementById(
      "match-end-overlay-v1"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


/* ========================================
   最終順位
======================================== */

function getFinalRankingV1() {

  return [
    ...positions
  ]
    .sort(
      (a, b) => {

        const scoreDifference =
          gameState.scores[b]
          -
          gameState.scores[a];


        if (
          scoreDifference !== 0
        ) {

          return scoreDifference;

        }


        /*
          同点時は
          起家に近い人が上位
        */

        return (
          initialRanks[a]
          -
          initialRanks[b]
        );

      }
    );

}


/* ========================================
   終了結果保存
======================================== */

function saveFinishedResultV1() {

  const ranking =
    getFinalRankingV1();


  const result = {

    version:
      1,

    status:
      "途中終了",

    savedAt:
      new Date()
        .toISOString(),

    roundWind:
      gameState.roundWind,

    handNumber:
      gameState.handNumber,

    honba:
      gameState.honba,

    kyotaku:
      gameState.kyotaku,

    players:
      ranking.map(
        (position, index) => ({

          rank:
            index + 1,

          position,

          name:
            currentPlayers[
              position
            ],

          score:
            gameState.scores[
              position
            ]

        })
      )

  };


  localStorage.setItem(
    FINISHED_MATCH_KEY_V1,
    JSON.stringify(
      result
    )
  );


  return result;

}


/* ========================================
   アクティブ対局保存削除
======================================== */

function clearActiveMatchStorageV1() {

  /*
    自動保存を止めるため
    先に対局画面を非表示にする
  */

  gameScreen
    .classList
    .remove(
      "active"
    );


  localStorage.removeItem(
    LOCAL_MATCH_SAVE_KEY_V1
  );


  localStorage.removeItem(
    LOCAL_DRAFT_SAVE_KEY_V1
  );


  lastLocalSaveHashV1 =
    "";


  lastDraftHashV1 =
    "";

}


/* ========================================
   結果を残して終了
======================================== */

function finishMatchAndKeepResultV1() {

  const result =
    saveFinishedResultV1();


  closeMatchEndDialogV1();


  clearActiveMatchStorageV1();


  renderFinalResultV1(
    result
  );

}


/* ========================================
   破棄して終了
======================================== */

function finishMatchAndDiscardV1() {

  const confirmed =
    window.confirm(
      "この対局結果を残さず終了しますか？"
    );


  if (
    !confirmed
  ) {

    return;

  }


  closeMatchEndDialogV1();


  clearActiveMatchStorageV1();


  showSimpleHomeV1();

}


/* ========================================
   最終結果表示
======================================== */

function renderFinalResultV1(
  result
) {

  closeFinalResultV1();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "final-result-overlay-v1";


  overlay.className =
    "final-result-overlay-v1";


  const rows =
    result.players
      .map(
        (player) => `

          <div
            class="
              final-result-row-v1
              ${
                player.rank === 1
                  ? "first"
                  : ""
              }
            "
          >

            <div class="final-result-rank-v1">
              ${player.rank}位
            </div>


            <div class="final-result-name-v1">

              ${
                escapeHtml(
                  player.name
                )
              }

            </div>


            <div class="final-result-score-v1">

              ${
                player.score
                  .toLocaleString(
                    "ja-JP"
                  )
              }

            </div>

          </div>
        `
      )
      .join("");


  overlay.innerHTML = `

    <div class="final-result-card-v1">

      <div class="final-result-title-v1">

        <h2>
          対局結果
        </h2>


        <span class="final-result-status-v1">
          ${
            escapeHtml(
              result.status
            )
          }
        </span>

      </div>


      <div class="final-result-list-v1">

        ${rows}

      </div>


      <div class="final-result-info-v1">

        ${
          escapeHtml(
            `${result.roundWind}${result.handNumber}局`
          )
        }

        ・

        ${
          result.honba
        }本場

        ・

        供託
        ${
          result.kyotaku
        }

      </div>


      <div class="final-result-actions-v1">

        <button
          type="button"
          id="final-new-match-v1"
        >
          新しい対局
        </button>


        <button
          type="button"
          id="final-home-v1"
        >
          ホーム
        </button>


        <button
          type="button"
          id="final-same-players-v1"
        >
          同じ4人で
          <br>
          もう一度
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  document
    .getElementById(
      "final-new-match-v1"
    )
    .onclick =
    prepareNewMatchSetupV1;


  document
    .getElementById(
      "final-home-v1"
    )
    .onclick =
    showSimpleHomeV1;


  document
    .getElementById(
      "final-same-players-v1"
    )
    .onclick =
    prepareSamePlayersSetupV1;

}


function closeFinalResultV1() {

  const overlay =
    document.getElementById(
      "final-result-overlay-v1"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


/* ========================================
   対局状態初期化
======================================== */

function resetGameStateForNewMatchV1() {

  positions.forEach(
    (position) => {

      gameState.scores[
        position
      ] =
        25000;


      gameState.riichi[
        position
      ] =
        false;

    }
  );


  gameState.kyotaku =
    0;


  gameState.honba =
    0;


  gameState.roundWind =
    "東";


  gameState.handNumber =
    1;


  /*
    Undo履歴もリセット
  */

  if (
    typeof undoHistoryV2
    !==
    "undefined"
  ) {

    undoHistoryV2.splice(
      0
    );

  }


  if (
    typeof redoHistoryV2
    !==
    "undefined"
  ) {

    redoHistoryV2 = [];

  }


  updateRedoButtonV2();

}


/* ========================================
   新しい対局
======================================== */

function prepareNewMatchSetupV1() {

  closeFinalResultV1();

  closeSimpleHomeV1();


  resetGameStateForNewMatchV1();


  positions.forEach(
    (position) => {

      const input =
        document.getElementById(
          `name-${position}`
        );


      if (
        input
      ) {

        input.value =
          "";

      }

    }
  );


  prepareDealerReselectionV1();


  confirmScreen
    .classList
    .remove(
      "active"
    );


  gameScreen
    .classList
    .remove(
      "active"
    );


  setupScreen
    .classList
    .add(
      "active"
    );

}


/* ========================================
   同じ4人でもう一度
======================================== */

function prepareSamePlayersSetupV1() {

  closeFinalResultV1();

  closeSimpleHomeV1();


  const oldPlayers = {
    ...currentPlayers
  };


  resetGameStateForNewMatchV1();


  positions.forEach(
    (position) => {

      const input =
        document.getElementById(
          `name-${position}`
        );


      if (
        input
      ) {

        input.value =
          oldPlayers[
            position
          ];

      }

    }
  );


  prepareDealerReselectionV1();


  confirmScreen
    .classList
    .remove(
      "active"
    );


  gameScreen
    .classList
    .remove(
      "active"
    );


  setupScreen
    .classList
    .add(
      "active"
    );

}


/* ========================================
   起家を再選択必須にする
======================================== */

function prepareDealerReselectionV1() {

  dealerSelectionRequiredV1 =
    true;


  dealerButtons.forEach(
    (button) => {

      button.classList.remove(
        "active"
      );


      button.textContent =
        "親にする";

    }
  );

}


/*
  親を選んだら
  再選択済みにする
*/

dealerButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        dealerSelectionRequiredV1 =
          false;

      },
      true
    );

  }
);


/*
  親未選択なら
  開始前確認へ進ませない
*/

goConfirmButton.addEventListener(
  "click",
  (event) => {

    if (
      !dealerSelectionRequiredV1
    ) {

      return;

    }


    event.preventDefault();

    event.stopPropagation();

    event.stopImmediatePropagation();


    setupError.textContent =
      "最初の親を選んでください。";

  },
  true
);


/* ========================================
   簡易ホーム
======================================== */

function showSimpleHomeV1() {

  closeFinalResultV1();

  closeSimpleHomeV1();


  setupScreen
    .classList
    .remove(
      "active"
    );


  confirmScreen
    .classList
    .remove(
      "active"
    );


  gameScreen
    .classList
    .remove(
      "active"
    );


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "simple-home-overlay-v1";


  overlay.className =
    "simple-home-overlay-v1";


  let finishedButton =
    "";


  const result =
    readFinishedResultV1();


  if (
    result
  ) {

    finishedButton = `

      <button
        type="button"
        id="home-finished-result-v1"
      >
        直前の対局結果を見る
      </button>
    `;

  }


  overlay.innerHTML = `

    <div class="simple-home-card-v1">

      <h1>
        麻雀対局管理
      </h1>


      <button
        type="button"
        id="home-new-match-v1"
      >
        新しい対局
      </button>


      ${finishedButton}

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  document
    .getElementById(
      "home-new-match-v1"
    )
    .onclick =
    prepareNewMatchSetupV1;


  const finished =
    document.getElementById(
      "home-finished-result-v1"
    );


  if (
    finished
  ) {

    finished.onclick =
      () => {

        const saved =
          readFinishedResultV1();


        if (
          saved
        ) {

          closeSimpleHomeV1();

          renderFinalResultV1(
            saved
          );

        }

      };

  }

}


function closeSimpleHomeV1() {

  const overlay =
    document.getElementById(
      "simple-home-overlay-v1"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


/* ========================================
   保存済み終了結果読み込み
======================================== */

function readFinishedResultV1() {

  const raw =
    localStorage.getItem(
      FINISHED_MATCH_KEY_V1
    );


  if (
    !raw
  ) {

    return null;

  }


  try {

    const result =
      JSON.parse(
        raw
      );


    /*
      30日経過した結果は削除
    */

    const savedTime =
      new Date(
        result.savedAt
      )
      .getTime();


    const now =
      Date.now();


    const thirtyDays =
      30
      * 24
      * 60
      * 60
      * 1000;


    if (
      now - savedTime
      >
      thirtyDays
    ) {

      localStorage.removeItem(
        FINISHED_MATCH_KEY_V1
      );


      return null;

    }


    return result;

  } catch (
    error
  ) {

    return null;

  }

}
/* ========================================
   中断・再開 Ver.1
======================================== */

const INTERRUPTED_MATCH_KEY_V1 =
  "MahjongScoreApp_interrupted_v1";


const INTERRUPTED_MATCH_LIFETIME_V1 =
  7
  * 24
  * 60
  * 60
  * 1000;


/* ========================================
   中断データ作成
======================================== */

function buildInterruptedMatchV1() {

  const base =
    buildLocalMatchSaveV1();


  let undoHistory =
    [];


  if (
    typeof undoHistoryV2
    !==
    "undefined"
  ) {

    undoHistory =
      JSON.parse(
        JSON.stringify(
          undoHistoryV2
        )
      );

  }


  return {

    ...base,

    status:
      "interrupted",

    interruptedAt:
      new Date()
        .toISOString(),

    undoHistory

  };

}


/* ========================================
   中断データ保存
======================================== */

function saveInterruptedMatchV1() {

  const data =
    buildInterruptedMatchV1();


  localStorage.setItem(
    INTERRUPTED_MATCH_KEY_V1,
    JSON.stringify(
      data
    )
  );


  return data;

}


/* ========================================
   中断データ取得
======================================== */

function readInterruptedMatchV1() {

  const raw =
    localStorage.getItem(
      INTERRUPTED_MATCH_KEY_V1
    );


  if (
    !raw
  ) {

    return null;

  }


  try {

    const data =
      JSON.parse(
        raw
      );


    if (
      !data
      ||
      !data.interruptedAt
      ||
      !data.currentPlayers
      ||
      !data.gameState
    ) {

      return null;

    }


    const interruptedTime =
      new Date(
        data.interruptedAt
      )
      .getTime();


    const age =
      Date.now()
      -
      interruptedTime;


    /*
      7日経過したら削除
    */

    if (
      age
      >=
      INTERRUPTED_MATCH_LIFETIME_V1
    ) {

      localStorage.removeItem(
        INTERRUPTED_MATCH_KEY_V1
      );


      return null;

    }


    return data;

  } catch (
    error
  ) {

    console.error(
      "中断対局の読込に失敗しました",
      error
    );


    return null;

  }

}


/* ========================================
   残り時間
======================================== */

function getInterruptedRemainingV1(
  data
) {

  const interruptedTime =
    new Date(
      data.interruptedAt
    )
    .getTime();


  const elapsed =
    Date.now()
    -
    interruptedTime;


  return (
    INTERRUPTED_MATCH_LIFETIME_V1
    -
    elapsed
  );

}


/* ========================================
   対局中断
======================================== */

function interruptCurrentMatchV1() {

  /*
    アガリ・流局などの入力途中なら
    中断させない
  */

  if (
    agariFlow.active
    ||
    ryuukyokuFlowV1.active
    ||
    pointCorrectionV1.active
  ) {

    if (
      typeof showUndoToastV2
      ===
      "function"
    ) {

      showUndoToastV2(
        "入力を完了してから中断してください"
      );

    }


    return;

  }


  /*
    既に別の中断対局がある場合
  */

  const existing =
    readInterruptedMatchV1();


  if (
    existing
  ) {

    const overwrite =
      window.confirm(
        "すでに中断中の対局があります。\n現在の対局で上書きしますか？"
      );


    if (
      !overwrite
    ) {

      return;

    }

  }


  const confirmed =
    window.confirm(
      "この対局を中断してホームへ戻りますか？"
    );


  if (
    !confirmed
  ) {

    return;

  }


  saveInterruptedMatchV1();


  /*
    「進行中」の自動復旧データは削除。

    中断データの方を正本にする。
  */

  gameScreen
    .classList
    .remove(
      "active"
    );


  localStorage.removeItem(
    LOCAL_MATCH_SAVE_KEY_V1
  );


  localStorage.removeItem(
    LOCAL_DRAFT_SAVE_KEY_V1
  );


  lastLocalSaveHashV1 =
    "";


  lastDraftHashV1 =
    "";


  showSimpleHomeV1();

}


/* ========================================
   再開
======================================== */

function resumeInterruptedMatchV1() {

  const data =
    readInterruptedMatchV1();


  if (
    !data
  ) {

    window.alert(
      "中断対局の保存期限が切れているか、データがありません。"
    );


    showSimpleHomeV1();

    return;

  }


  /*
    プレイヤー
  */

  currentPlayers = {
    ...data.currentPlayers
  };


  /*
    親
  */

  dealerPosition =
    data.dealerPosition;


  /*
    初期順位
  */

  initialRanks = {
    ...(data.initialRanks || {})
  };


  /*
    状態復元
  */

  positions.forEach(
    (position) => {

      gameState.scores[
        position
      ] =
        data.gameState
          .scores[position];


      gameState.riichi[
        position
      ] =
        Boolean(
          data.gameState
            .riichi[
              position
            ]
        );

    }
  );


  gameState.kyotaku =
    Number(
      data.gameState.kyotaku
      || 0
    );


  gameState.honba =
    Number(
      data.gameState.honba
      || 0
    );


  gameState.roundWind =
    data.gameState.roundWind
    ||
    "東";


  gameState.handNumber =
    Number(
      data.gameState.handNumber
      ||
      1
    );


  /*
    名前表示
  */

  positions.forEach(
    (position) => {

      const nameElement =
        document.getElementById(
          `game-name-${position}`
        );


      if (
        nameElement
      ) {

        nameElement.textContent =
          currentPlayers[
            position
          ];

      }

    }
  );


  /*
    Undo履歴も戻す
  */

  if (
    typeof undoHistoryV2
    !==
    "undefined"
  ) {

    undoHistoryV2.splice(
      0
    );


    if (
      Array.isArray(
        data.undoHistory
      )
    ) {

      data.undoHistory
        .slice(
          -3
        )
        .forEach(
          (action) => {

            undoHistoryV2.push(
              action
            );

          }
        );

    }

  }


  if (
    typeof redoHistoryV2
    !==
    "undefined"
  ) {

    redoHistoryV2 =
      [];

  }


  updateRedoButtonV2();


  /*
    画面
  */

  closeSimpleHomeV1();


  setupScreen
    .classList
    .remove(
      "active"
    );


  confirmScreen
    .classList
    .remove(
      "active"
    );


  gameScreen
    .classList
    .add(
      "active"
    );


  updateDealerAndSeatWinds();

  updateRoundDisplay();

  updateGameUI();


  /*
    再開後は「進行中」に戻すので
    中断データを削除。
  */

  localStorage.removeItem(
    INTERRUPTED_MATCH_KEY_V1
  );


  /*
    現在状態をすぐ進行中保存へ
  */

  lastLocalSaveHashV1 =
    "";


  saveLocalMatchV1();


  /*
    再度中断した場合は
    その時点から7日を数え直す。
  */


  if (
    typeof showUndoToastV2
    ===
    "function"
  ) {

    showUndoToastV2(

      `${
        getRoundName()
      } ${
        gameState.honba
      }本場から再開します`

    );

  }

}


/* ========================================
   中断対局を終了
======================================== */

function endInterruptedMatchV1() {

  const data =
    readInterruptedMatchV1();


  if (
    !data
  ) {

    showSimpleHomeV1();

    return;

  }


  const confirmed =
    window.confirm(
      "中断中の対局を終了しますか？"
    );


  if (
    !confirmed
  ) {

    return;

  }


  /*
    結果を残すか確認
  */

  const keepResult =
    window.confirm(
      "現在の点数を結果として残しますか？\n\nOK：結果を残す\nキャンセル：破棄する"
    );


  if (
    keepResult
  ) {

    /*
      一時的に現在状態へ読み込み
      → 既存の結果保存処理を使う
    */

    currentPlayers = {
      ...data.currentPlayers
    };


    dealerPosition =
      data.dealerPosition;


    initialRanks = {
      ...(data.initialRanks || {})
    };


    positions.forEach(
      (position) => {

        gameState.scores[
          position
        ] =
          data.gameState
            .scores[position];

      }
    );


    gameState.kyotaku =
      data.gameState.kyotaku
      || 0;


    gameState.honba =
      data.gameState.honba
      || 0;


    gameState.roundWind =
      data.gameState.roundWind
      ||
      "東";


    gameState.handNumber =
      data.gameState.handNumber
      ||
      1;


    const result =
      saveFinishedResultV1();


    localStorage.removeItem(
      INTERRUPTED_MATCH_KEY_V1
    );


    closeSimpleHomeV1();


    renderFinalResultV1(
      result
    );


    return;

  }


  /*
    破棄
  */

  localStorage.removeItem(
    INTERRUPTED_MATCH_KEY_V1
  );


  showSimpleHomeV1();

}


/* ========================================
   メニュー Ver.3
   中断を追加
======================================== */

function openSimpleGameMenuV1() {

  closeSimpleGameMenuV1();


  const menu =
    document.createElement(
      "div"
    );


  menu.id =
    "simple-game-menu-v1";


  menu.className =
    "simple-game-menu";


  menu.innerHTML = `

    <button
      type="button"
      id="open-point-correction-v1"
    >
      点数修正
    </button>


    <button
      type="button"
      id="interrupt-match-v1"
    >
      対局を中断
    </button>


    <button
      type="button"
      id="open-match-end-v1"
    >
      対局を終了
    </button>


    <button
      type="button"
      id="close-simple-menu-v1"
    >
      閉じる
    </button>
  `;


  document.body.appendChild(
    menu
  );


  document
    .getElementById(
      "open-point-correction-v1"
    )
    .onclick =
    () => {

      closeSimpleGameMenuV1();

      startPointCorrectionV1();

    };


  document
    .getElementById(
      "interrupt-match-v1"
    )
    .onclick =
    () => {

      closeSimpleGameMenuV1();

      interruptCurrentMatchV1();

    };


  document
    .getElementById(
      "open-match-end-v1"
    )
    .onclick =
    () => {

      closeSimpleGameMenuV1();

      openMatchEndDialogV1();

    };


  document
    .getElementById(
      "close-simple-menu-v1"
    )
    .onclick =
    closeSimpleGameMenuV1;

}


/* ========================================
   ホーム Ver.2
======================================== */

function showSimpleHomeV1() {

  closeFinalResultV1();

  closeSimpleHomeV1();


  setupScreen
    .classList
    .remove(
      "active"
    );


  confirmScreen
    .classList
    .remove(
      "active"
    );


  gameScreen
    .classList
    .remove(
      "active"
    );


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "simple-home-overlay-v1";


  overlay.className =
    "simple-home-overlay-v1";


  /*
    中断対局
  */

  const interrupted =
    readInterruptedMatchV1();


  let interruptedHtml =
    "";


  if (
    interrupted
  ) {

    const remaining =
      getInterruptedRemainingV1(
        interrupted
      );


    const playerNames =
      positions
        .map(
          (position) =>
            interrupted
              .currentPlayers[
                position
              ]
        )
        .join("・");


    let warning =
      "";


    /*
      残り24時間
    */

    if (
      remaining
      <=
      24
      * 60
      * 60
      * 1000
    ) {

      warning = `

        <div class="interrupted-match-warning-v1">
          あと1日で削除
        </div>
      `;

    }


    interruptedHtml = `

      <div class="interrupted-match-card-v1">

        <h3>
          中断中の対局
        </h3>


        <div class="interrupted-match-round-v1">

          ${
            escapeHtml(
              `${interrupted.gameState.roundWind}${interrupted.gameState.handNumber}局`
            )
          }

          ・

          ${
            interrupted
              .gameState
              .honba
          }本場

        </div>


        <div class="interrupted-match-players-v1">

          ${
            escapeHtml(
              playerNames
            )
          }

        </div>


        ${warning}


        <div class="interrupted-match-actions-v1">

          <button
            type="button"
            id="resume-interrupted-v1"
            class="interrupted-resume-v1"
          >
            再開
          </button>


          <button
            type="button"
            id="end-interrupted-v1"
            class="interrupted-end-v1"
          >
            終了
          </button>

        </div>

      </div>
    `;

  }


  /*
    終了済み
  */

  let finishedButton =
    "";


  const result =
    readFinishedResultV1();


  if (
    result
  ) {

    finishedButton = `

      <button
        type="button"
        id="home-finished-result-v1"
      >
        直前の対局結果を見る
      </button>
    `;

  }


  overlay.innerHTML = `

    <div class="simple-home-card-v1">

      <h1>
        麻雀対局管理
      </h1>


      ${interruptedHtml}


      <button
        type="button"
        id="home-new-match-v1"
      >
        新しい対局
      </button>


      ${finishedButton}

    </div>
  `;


  document.body.appendChild(
    overlay
  );


  /*
    新しい対局
  */

  document
    .getElementById(
      "home-new-match-v1"
    )
    .onclick =
    () => {

      /*
        中断中がある場合は
        新しい対局を作らせない。

        中断対局は最大1件。
      */

      const interrupted =
        readInterruptedMatchV1();


      if (
        interrupted
      ) {

        const result =
          window.confirm(
            "中断中の対局があります。\n終了して新しい対局を始めますか？"
          );


        if (
          !result
        ) {

          return;

        }


        localStorage.removeItem(
          INTERRUPTED_MATCH_KEY_V1
        );

      }


      prepareNewMatchSetupV1();

    };


  /*
    中断対局
  */

  const resumeButton =
    document.getElementById(
      "resume-interrupted-v1"
    );


  if (
    resumeButton
  ) {

    resumeButton.onclick =
      resumeInterruptedMatchV1;

  }


  const endButton =
    document.getElementById(
      "end-interrupted-v1"
    );


  if (
    endButton
  ) {

    endButton.onclick =
      endInterruptedMatchV1;

  }


  /*
    終了結果
  */

  const finished =
    document.getElementById(
      "home-finished-result-v1"
    );


  if (
    finished
  ) {

    finished.onclick =
      () => {

        const saved =
          readFinishedResultV1();


        if (
          saved
        ) {

          closeSimpleHomeV1();


          renderFinalResultV1(
            saved
          );

        }

      };

  }

}


/* ========================================
   起動時

   進行中データが無く、
   中断対局だけある場合は
   ホームを表示
======================================== */

function initInterruptedHomeV1() {

  const activeMatch =
    localStorage.getItem(
      LOCAL_MATCH_SAVE_KEY_V1
    );


  const interrupted =
    readInterruptedMatchV1();


  if (
    !activeMatch
    &&
    interrupted
  ) {

    setTimeout(
      () => {

        showSimpleHomeV1();

      },
      250
    );

  }

}


if (
  document.readyState
  ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initInterruptedHomeV1
  );

} else {

  initInterruptedHomeV1();

}

/* ========================================
   新しい対局：最初から / 途中から Ver.2
   途中開始は局間のみ
======================================== */

function ensureNewMatchModeStylesV2() {

  if (
    document.getElementById(
      "new-match-mode-style-v2"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "new-match-mode-style-v2";


  style.textContent = `
    .new-match-mode-overlay-v2,
    .mid-match-setup-overlay-v2 {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.58);
      z-index: 20000;
      overflow: auto;
    }

    .new-match-mode-card-v2,
    .mid-match-setup-card-v2 {
      width: min(760px, 96vw);
      max-height: 94vh;
      overflow: auto;
      box-sizing: border-box;
      padding: 20px;
      border-radius: 18px;
      background: rgba(24, 39, 36, 0.99);
      color: white;
      box-shadow: 0 18px 55px rgba(0, 0, 0, 0.48);
    }

    .new-match-mode-card-v2 {
      width: min(420px, 92vw);
      text-align: center;
    }

    .new-match-mode-card-v2 h2,
    .mid-match-setup-card-v2 h2 {
      margin: 0 0 8px;
      font-size: 23px;
    }

    .new-match-mode-card-v2 p,
    .mid-match-setup-note-v2 {
      color: rgba(255,255,255,0.7);
      font-size: 13px;
      line-height: 1.6;
    }

    .new-match-mode-actions-v2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-top: 16px;
    }

    .new-match-mode-actions-v2 button,
    .mid-match-setup-actions-v2 button {
      padding: 12px;
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 800;
      cursor: pointer;
    }

    .new-match-from-start-v2,
    .mid-match-start-v2 {
      background: #20bd70;
    }

    .new-match-from-mid-v2 {
      background: #2785e8;
    }

    .new-match-cancel-v2,
    .mid-match-cancel-v2 {
      background: #626b68;
    }

    .new-match-cancel-v2 {
      grid-column: 1 / -1;
    }

    .mid-match-player-grid-v2 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .mid-match-player-card-v2 {
      padding: 10px;
      border-radius: 12px;
      background: rgba(255,255,255,0.07);
    }

    .mid-match-player-card-v2 strong {
      display: block;
      margin-bottom: 7px;
      text-align: center;
      font-size: 13px;
    }

    .mid-match-player-card-v2 input,
    .mid-match-setting-grid-v2 select,
    .mid-match-setting-grid-v2 input {
      width: 100%;
      box-sizing: border-box;
      padding: 9px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
    }

    .mid-match-player-card-v2 input + input {
      margin-top: 7px;
    }

    .mid-match-setting-grid-v2 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 9px;
      margin-top: 12px;
    }

    .mid-match-setting-item-v2 label {
      display: block;
      margin-bottom: 5px;
      color: rgba(255,255,255,0.7);
      font-size: 12px;
    }

    .mid-match-total-v2 {
      margin-top: 12px;
      padding: 9px 11px;
      border-radius: 9px;
      background: rgba(255,255,255,0.07);
      text-align: center;
      font-size: 13px;
    }

    .mid-match-error-v2 {
      min-height: 18px;
      margin-top: 8px;
      color: #ff9b9b;
      text-align: center;
      font-size: 12px;
    }

    .mid-match-setup-actions-v2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }

    @media (max-width: 700px) {
      .mid-match-player-grid-v2 {
        grid-template-columns: repeat(2, 1fr);
      }

      .mid-match-setting-grid-v2 {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;


  document.head.appendChild(
    style
  );

}


function closeNewMatchModeDialogV2() {

  const overlay =
    document.getElementById(
      "new-match-mode-overlay-v2"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


function closeMidMatchSetupV2() {

  const overlay =
    document.getElementById(
      "mid-match-setup-overlay-v2"
    );


  if (
    overlay
  ) {

    overlay.remove();

  }

}


function prepareFreshMatchSetupV2() {

  closeNewMatchModeDialogV2();

  resetGameStateForNewMatchV1();


  localStorage.removeItem(
    LOCAL_MATCH_SAVE_KEY_V1
  );

  localStorage.removeItem(
    LOCAL_DRAFT_SAVE_KEY_V1
  );


  lastLocalSaveHashV1 =
    "";

  lastDraftHashV1 =
    "";


  positions.forEach(
    (position) => {

      const input =
        document.getElementById(
          `name-${position}`
        );


      if (
        input
      ) {

        input.value =
          "";

      }

    }
  );


  prepareDealerReselectionV1();


  confirmScreen
    .classList
    .remove(
      "active"
    );

  gameScreen
    .classList
    .remove(
      "active"
    );

  setupScreen
    .classList
    .add(
      "active"
    );

}


function getMidMatchDefaultNameV2(
  position,
  fallback
) {

  if (
    currentPlayers
    &&
    typeof currentPlayers[
      position
    ] === "string"
    &&
    currentPlayers[
      position
    ].trim()
  ) {

    return currentPlayers[
      position
    ].trim();

  }


  const input =
    document.getElementById(
      `name-${position}`
    );


  if (
    input
    &&
    input.value.trim()
  ) {

    return input.value.trim();

  }


  return fallback;

}


function buildInitialRanksFromDealerV2(
  startingDealer
) {

  const startIndex =
    positions.indexOf(
      startingDealer
    );


  const result =
    {};


  positions.forEach(
    (position, index) => {

      result[position] =
        (
          index
          - startIndex
          + 4
        ) % 4
        + 1;

    }
  );


  return result;

}


function inferStartingDealerV2(
  currentDealer,
  handNumber
) {

  const currentIndex =
    positions.indexOf(
      currentDealer
    );


  if (
    currentIndex < 0
  ) {

    return positions[0];

  }


  const rotations =
    Math.max(
      0,
      Number(handNumber) - 1
    ) % 4;


  return positions[
    (
      currentIndex
      - rotations
      + 4
    ) % 4
  ];

}


function updateMidMatchTotalV2() {

  const totalElement =
    document.getElementById(
      "mid-match-total-v2"
    );


  if (
    !totalElement
  ) {

    return;

  }


  let scoreTotal =
    0;


  positions.forEach(
    (position) => {

      const input =
        document.getElementById(
          `mid-score-${position}-v2`
        );


      scoreTotal +=
        Number(
          input?.value
          || 0
        );

    }
  );


  const kyotaku =
    Number(
      document.getElementById(
        "mid-kyotaku-v2"
      )?.value
      || 0
    );


  const total =
    scoreTotal
    + kyotaku * 1000;


  totalElement.textContent =
    `持ち点合計 + 供託 = ${total.toLocaleString("ja-JP")}点`;

}


function openMidMatchSetupV2() {

  ensureNewMatchModeStylesV2();

  closeNewMatchModeDialogV2();

  closeMidMatchSetupV2();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "mid-match-setup-overlay-v2";

  overlay.className =
    "mid-match-setup-overlay-v2";


  const defaultNames = {

    top:
      getMidMatchDefaultNameV2(
        "top",
        "A"
      ),

    right:
      getMidMatchDefaultNameV2(
        "right",
        "B"
      ),

    bottom:
      getMidMatchDefaultNameV2(
        "bottom",
        "C"
      ),

    left:
      getMidMatchDefaultNameV2(
        "left",
        "D"
      )

  };


  const playerCards =
    [
      ["top", "上"],
      ["right", "右"],
      ["bottom", "下"],
      ["left", "左"]
    ]
      .map(
        ([position, label]) => `
          <div class="mid-match-player-card-v2">
            <strong>${label}のプレイヤー</strong>
            <input
              id="mid-name-${position}-v2"
              maxlength="12"
              value="${escapeHtml(defaultNames[position])}"
              placeholder="名前"
            >
            <input
              id="mid-score-${position}-v2"
              type="number"
              inputmode="numeric"
              step="100"
              value="25000"
              placeholder="持ち点"
            >
          </div>
        `
      )
      .join("");


  const roundOptions =
    ["東", "南", "西"]
      .flatMap(
        (wind) =>
          [1, 2, 3, 4]
            .map(
              (hand) =>
                `<option value="${wind}|${hand}">${wind}${hand}局</option>`
            )
      )
      .join("");


  const playerOptions =
    positions
      .map(
        (position) =>
          `<option value="${position}">${escapeHtml(defaultNames[position])}</option>`
      )
      .join("");


  overlay.innerHTML = `
    <div class="mid-match-setup-card-v2">
      <h2>途中から開始</h2>

      <div class="mid-match-setup-note-v2">
        局間の状態を入力してください。起家は現在局と現在の親から自動判定し、リーチ状態は全員OFFで開始します。
      </div>

      <div class="mid-match-player-grid-v2">
        ${playerCards}
      </div>

      <div class="mid-match-setting-grid-v2">
        <div class="mid-match-setting-item-v2">
          <label>現在局</label>
          <select id="mid-round-v2">
            ${roundOptions}
          </select>
        </div>

        <div class="mid-match-setting-item-v2">
          <label>現在の親</label>
          <select id="mid-current-dealer-v2">
            ${playerOptions}
          </select>
        </div>

        <div class="mid-match-setting-item-v2">
          <label>本場</label>
          <input
            id="mid-honba-v2"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            value="0"
          >
        </div>

        <div class="mid-match-setting-item-v2">
          <label>供託</label>
          <input
            id="mid-kyotaku-v2"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            value="0"
          >
        </div>
      </div>

      <div
        id="mid-match-total-v2"
        class="mid-match-total-v2"
      >
        持ち点合計 + 供託 = 100,000点
      </div>

      <div
        id="mid-match-error-v2"
        class="mid-match-error-v2"
      ></div>

      <div class="mid-match-setup-actions-v2">
        <button
          id="mid-match-cancel-v2"
          type="button"
          class="mid-match-cancel-v2"
        >
          戻る
        </button>

        <button
          id="mid-match-start-v2"
          type="button"
          class="mid-match-start-v2"
        >
          この状態から開始
        </button>
      </div>
    </div>
  `;


  document.body.appendChild(
    overlay
  );


  const refreshPlayerSelectLabels =
    () => {

      const labels =
        {};


      positions.forEach(
        (position) => {

          labels[position] =
            document.getElementById(
              `mid-name-${position}-v2`
            )?.value.trim()
            || position;

        }
      );


      [
        "mid-current-dealer-v2"
      ].forEach(
        (id) => {

          const select =
            document.getElementById(
              id
            );


          if (
            !select
          ) {

            return;

          }


          Array.from(
            select.options
          ).forEach(
            (option) => {

              option.textContent =
                labels[
                  option.value
                ];

            }
          );

        }
      );

    };


  positions.forEach(
    (position) => {

      document
        .getElementById(
          `mid-name-${position}-v2`
        )
        ?.addEventListener(
          "input",
          refreshPlayerSelectLabels
        );


      document
        .getElementById(
          `mid-score-${position}-v2`
        )
        ?.addEventListener(
          "input",
          updateMidMatchTotalV2
        );

    }
  );


  document
    .getElementById(
      "mid-kyotaku-v2"
    )
    ?.addEventListener(
      "input",
      updateMidMatchTotalV2
    );


  document
    .getElementById(
      "mid-match-cancel-v2"
    )
    .onclick =
    () => {

      closeMidMatchSetupV2();

      openNewMatchModeDialogV2();

    };


  document
    .getElementById(
      "mid-match-start-v2"
    )
    .onclick =
    startMidMatchFromFormV2;


  updateMidMatchTotalV2();

}


function startMidMatchFromFormV2() {

  const errorElement =
    document.getElementById(
      "mid-match-error-v2"
    );


  const players =
    {};

  const scores =
    {};


  for (
    const position of positions
  ) {

    const name =
      document.getElementById(
        `mid-name-${position}-v2`
      )
      ?.value
      .trim()
      || "";


    const score =
      Number(
        document.getElementById(
          `mid-score-${position}-v2`
        )
        ?.value
      );


    if (
      !name
    ) {

      errorElement.textContent =
        "4人全員の名前を入力してください。";

      return;

    }


    if (
      name.length > 12
    ) {

      errorElement.textContent =
        "名前は12文字以内にしてください。";

      return;

    }


    if (
      !Number.isInteger(
        score
      )
      ||
      score % 100 !== 0
    ) {

      errorElement.textContent =
        "持ち点は100点単位で入力してください。";

      return;

    }


    players[position] =
      name;

    scores[position] =
      score;

  }


  if (
    new Set(
      Object.values(
        players
      )
    ).size !== 4
  ) {

    errorElement.textContent =
      "同じ名前は使用できません。";

    return;

  }


  const honba =
    Number(
      document.getElementById(
        "mid-honba-v2"
      ).value
    );

  const kyotaku =
    Number(
      document.getElementById(
        "mid-kyotaku-v2"
      ).value
    );


  if (
    !Number.isInteger(honba)
    ||
    honba < 0
    ||
    !Number.isInteger(kyotaku)
    ||
    kyotaku < 0
  ) {

    errorElement.textContent =
      "本場・供託は0以上の整数で入力してください。";

    return;

  }


  const total =
    Object.values(
      scores
    )
    .reduce(
      (sum, value) =>
        sum + value,
      0
    )
    + kyotaku * 1000;


  if (
    total !== 100000
  ) {

    const continueStart =
      window.confirm(
        `持ち点合計 + 供託が100,000点ではありません。\n現在：${total.toLocaleString("ja-JP")}点\n\nこのまま開始しますか？`
      );


    if (
      !continueStart
    ) {

      return;

    }

  }


  const [roundWind, handText] =
    document.getElementById(
      "mid-round-v2"
    )
    .value
    .split("|");

  const handNumber =
    Number(
      handText
    );

  const currentDealer =
    document.getElementById(
      "mid-current-dealer-v2"
    ).value;

  const startingDealer =
    inferStartingDealerV2(
      currentDealer,
      handNumber
    );


  currentPlayers = {
    ...players
  };


  dealerPosition =
    currentDealer;


  initialRanks =
    buildInitialRanksFromDealerV2(
      startingDealer
    );


  positions.forEach(
    (position) => {

      gameState.scores[
        position
      ] = scores[position];

      gameState.riichi[
        position
      ] = false;


      const nameElement =
        document.getElementById(
          `game-name-${position}`
        );


      if (
        nameElement
      ) {

        nameElement.textContent =
          currentPlayers[position];

      }

    }
  );


  gameState.roundWind =
    roundWind;

  gameState.handNumber =
    handNumber;

  gameState.honba =
    honba;

  gameState.kyotaku =
    kyotaku;


  agariFlow.active =
    false;

  agariFlow.committed =
    false;

  if (
    typeof ryuukyokuFlowV1
    !== "undefined"
  ) {

    ryuukyokuFlowV1.active =
      false;

  }


  if (
    typeof undoHistoryV2
    !== "undefined"
  ) {

    undoHistoryV2.splice(
      0
    );

  }


  if (
    typeof redoHistoryV2
    !== "undefined"
  ) {

    redoHistoryV2 =
      [];

  }


  if (
    typeof updateRedoButtonV2
    === "function"
  ) {

    updateRedoButtonV2();

  }


  localStorage.removeItem(
    LOCAL_MATCH_SAVE_KEY_V1
  );

  localStorage.removeItem(
    LOCAL_DRAFT_SAVE_KEY_V1
  );


  lastLocalSaveHashV1 =
    "";

  lastDraftHashV1 =
    "";


  closeMidMatchSetupV2();

  closeNewMatchModeDialogV2();


  setupScreen
    .classList
    .remove(
      "active"
    );

  confirmScreen
    .classList
    .remove(
      "active"
    );

  gameScreen
    .classList
    .add(
      "active"
    );


  updateDealerAndSeatWinds();

  updateRoundDisplay();

  updateGameUI();


  saveLocalMatchV1();


  if (
    typeof showUndoToastV2
    === "function"
  ) {

    showUndoToastV2(
      `${roundWind}${handNumber}局から開始しました`
    );

  }

}


function openNewMatchModeDialogV2() {

  ensureNewMatchModeStylesV2();

  closeNewMatchModeDialogV2();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "new-match-mode-overlay-v2";

  overlay.className =
    "new-match-mode-overlay-v2";


  overlay.innerHTML = `
    <div class="new-match-mode-card-v2">
      <h2>新しい対局</h2>
      <p>開始方法を選んでください。</p>

      <div class="new-match-mode-actions-v2">
        <button
          id="new-match-from-start-v2"
          type="button"
          class="new-match-from-start-v2"
        >
          最初から
        </button>

        <button
          id="new-match-from-mid-v2"
          type="button"
          class="new-match-from-mid-v2"
        >
          途中から
        </button>

        <button
          id="new-match-mode-cancel-v2"
          type="button"
          class="new-match-cancel-v2"
        >
          戻る
        </button>
      </div>
    </div>
  `;


  document.body.appendChild(
    overlay
  );


  document
    .getElementById(
      "new-match-from-start-v2"
    )
    .onclick =
    prepareFreshMatchSetupV2;


  document
    .getElementById(
      "new-match-from-mid-v2"
    )
    .onclick =
    openMidMatchSetupV2;


  document
    .getElementById(
      "new-match-mode-cancel-v2"
    )
    .onclick =
    () => {

      closeNewMatchModeDialogV2();

      if (
        typeof showSimpleHomeV1
        === "function"
      ) {

        showSimpleHomeV1();

      }

    };

}


/*
  既存の「新しい対局」入口を
  「最初から / 途中から」選択へ変更。
*/
function prepareNewMatchSetupV1() {

  closeFinalResultV1();

  closeSimpleHomeV1();

  openNewMatchModeDialogV2();

}



/* ========================================
   起家マーク Ver.1
   途中開始でも現在局と現在の親から
   起家を逆算して表示する
======================================== */

function getStartingDealerPositionV1() {

  if (
    !dealerPosition
  ) {

    return null;

  }


  const handNumber =
    Number(
      gameState.handNumber || 1
    );


  const currentDealerIndex =
    positions.indexOf(
      dealerPosition
    );


  if (
    currentDealerIndex === -1
  ) {

    return null;

  }


  /*
    東1 / 南1 / 西1 なら 0手前
    東2 / 南2 / 西2 なら 1手前
    ...
  */
  const offset =
    (
      (handNumber - 1) % 4 + 4
    ) % 4;


  const startIndex =
    (
      currentDealerIndex
      - offset
      + 4
    ) % 4;


  return positions[startIndex];

}


function clearStartingDealerMarkerV1() {

  document
    .querySelectorAll(
      ".starting-dealer-badge-v1"
    )
    .forEach(
      (badge) =>
        badge.remove()
    );

}


function updateStartingDealerMarkerV1() {

  clearStartingDealerMarkerV1();


  const startPosition =
    getStartingDealerPositionV1();


  if (
    !startPosition
  ) {

    return;

  }


  const panel =
    document.getElementById(
      `panel-${startPosition}`
    );


  if (
    !panel
  ) {

    return;

  }


  if (
    window.getComputedStyle(panel)
      .position === "static"
  ) {

    panel.style.position =
      "relative";

  }


  const badge =
    document.createElement(
      "div"
    );


  badge.className =
    "starting-dealer-badge-v1";


  badge.textContent =
    "起";


  const playerName =
    currentPlayers &&
    currentPlayers[startPosition]
      ? currentPlayers[startPosition]
      : "";


  badge.title =
    playerName
      ? `起家：${playerName}`
      : "起家";


  badge.style.cssText = `
    position: absolute;
    top: -10px;
    right: -10px;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: linear-gradient(135deg, #ffca28, #ff9800);
    color: #ffffff;
    font-size: 18px;
    font-weight: 800;
    line-height: 34px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28);
    z-index: 50;
    pointer-events: none;
  `;


  panel.appendChild(
    badge
  );

}


/* ========================================
   既存UI更新のたびに起家マークも更新
======================================== */

if (
  typeof updateGameUI
  === "function"
) {

  const originalUpdateGameUIStartingDealerV1 =
    updateGameUI;


  updateGameUI =
    function (...args) {

      const result =
        originalUpdateGameUIStartingDealerV1
          .apply(
            this,
            args
          );


      updateStartingDealerMarkerV1();


      return result;

    };

}


if (
  typeof updateDealerAndSeatWinds
  === "function"
) {

  const originalUpdateDealerAndSeatWindsStartingDealerV1 =
    updateDealerAndSeatWinds;


  updateDealerAndSeatWinds =
    function (...args) {

      const result =
        originalUpdateDealerAndSeatWindsStartingDealerV1
          .apply(
            this,
            args
          );


      updateStartingDealerMarkerV1();


      return result;

    };

}


/* ========================================
   初回表示
======================================== */

if (
  document.readyState
  === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    updateStartingDealerMarkerV1
  );

} else {

  setTimeout(
    updateStartingDealerMarkerV1,
    0
  );

}
/* ========================================
   初期設定：中央の説明枠をクリック貫通
======================================== */

function makeSetupCenterClickThroughV1() {

  const setup =
    document.getElementById("setup-screen");

  if (!setup) return;


  const elements =
    Array.from(
      setup.querySelectorAll("*")
    );


  const target =
    elements
      .filter((element) => {

        const text =
          element.textContent
            ?.replace(/\s/g, "");

        return (
          text?.includes("東1局") &&
          text?.includes("25000点スタート")
        );

      })
      .sort(
        (a, b) =>
          a.querySelectorAll("*").length -
          b.querySelectorAll("*").length
      )[0];


  if (target) {

    target.style.pointerEvents =
      "none";

  }

}


makeSetupCenterClickThroughV1();
// ========================================
// Supabase クラウド接続 Ver.1
// ========================================

(() => {

  const SUPABASE_URL =
    "https://gkngipqhsnoskazlhhgp.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_F8-ypaE5GQQIQUSPgTnW3Q_QN6MAhei";


  function showCloudMessageV1(
    message,
    isError = false
  ) {

    const old =
      document.getElementById(
        "cloud-status-message-v1"
      );

    if (old) {
      old.remove();
    }


    const element =
      document.createElement("div");

    element.id =
      "cloud-status-message-v1";

    element.textContent =
      message;

    element.style.cssText = `
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      padding: 10px 16px;
      border-radius: 999px;
      background: ${
        isError
          ? "rgba(190, 45, 45, 0.95)"
          : "rgba(20, 120, 75, 0.95)"
      };
      color: white;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      pointer-events: none;
    `;

    document.body.appendChild(
      element
    );


    setTimeout(
      () => {

        element.remove();

      },
      2500
    );

  }


  async function startSupabaseV1() {

    try {

      const client =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {

              persistSession: true,

              autoRefreshToken: true,

              detectSessionInUrl: false

            }
          }
        );


      window.mahjongSupabaseV1 =
        client;


      const {
        data: sessionData,
        error: sessionError
      } =
        await client.auth.getSession();


      if (sessionError) {
        throw sessionError;
      }


      let session =
        sessionData.session;


      /*
        初回だけ匿名ユーザーを作る。
        2回目以降は保存済みセッションを使用。
      */
      if (!session) {

        const {
          data,
          error
        } =
          await client.auth
            .signInAnonymously();


        if (error) {
          throw error;
        }


        session =
          data.session;

      }


      if (
        !session
        ||
        !session.user
      ) {

        throw new Error(
          "匿名ユーザーを取得できませんでした。"
        );

      }


      window.mahjongCloudUserIdV1 =
        session.user.id;


      console.log(
        "Supabase connected:",
        session.user.id
      );


      showCloudMessageV1(
        "クラウド接続OK"
      );

    } catch (error) {

      console.error(
        "Supabase connection error:",
        error
      );


      showCloudMessageV1(
        "クラウド接続エラー",
        true
      );

    }

  }


  function loadSupabaseLibraryV1() {

    if (
      window.supabase
      &&
      typeof window.supabase.createClient
        === "function"
    ) {

      startSupabaseV1();

      return;

    }


    const script =
      document.createElement(
        "script"
      );


    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


    script.onload =
      startSupabaseV1;


    script.onerror =
      () => {

        showCloudMessageV1(
          "Supabase読込エラー",
          true
        );

      };


    document.head.appendChild(
      script
    );

  }


  loadSupabaseLibraryV1();

})();
// ========================================
// クラウド対局作成・6桁コード発行 Ver.1
// ========================================

function buildCloudMatchStateV1() {

  return {

    currentPlayers:
      { ...currentPlayers },

    dealerPosition:
      dealerPosition,

    initialRanks:
      { ...initialRanks },

    gameState:
      JSON.parse(
        JSON.stringify(
          gameState
        )
      ),

    savedAt:
      new Date().toISOString()

  };

}


function generateCloudMatchCodeV1() {

  return String(
    Math.floor(
      100000
      +
      Math.random() * 900000
    )
  );

}


async function createCloudMatchV1() {

  const client =
    window.mahjongSupabaseV1;

  const userId =
    window.mahjongCloudUserIdV1;


  if (
    !client
    ||
    !userId
  ) {

    alert(
      "クラウド接続がまだ完了していません。"
    );

    return;

  }


  for (
    let attempt = 0;
    attempt < 10;
    attempt++
  ) {

    const code =
      generateCloudMatchCodeV1();


    const {
      data,
      error
    } =
      await client
        .from("matches")
        .insert({

          code:

            code,

          host_user_id:

            userId,

          state:

            buildCloudMatchStateV1(),

          status:

            "active"

        })
        .select(
          "id, code, version"
        )
        .single();


    /*
      6桁コードがたまたま
      既存コードと重複したら再生成
    */
    if (
      error
      &&
      error.code === "23505"
    ) {

      continue;

    }


    if (
      error
    ) {

      console.error(
        "クラウド対局作成エラー:",
        error
      );

      alert(
        "クラウド対局を作成できませんでした。"
      );

      return;

    }


    /*
      ホスト自身も参加者として登録
    */
    const {
      error:
        participantError
    } =
      await client
        .from(
          "match_participants"
        )
        .insert({

          match_id:

            data.id,

          user_id:

            userId

        });


    if (
      participantError
    ) {

      console.error(
        "参加者登録エラー:",
        participantError
      );

      alert(
        "参加者登録に失敗しました。"
      );

      return;

    }


    window.mahjongCloudMatchIdV1 =
      data.id;

    window.mahjongCloudMatchCodeV1 =
      data.code;


    localStorage.setItem(
      "MahjongScoreApp_cloud_match_v1",
      JSON.stringify({

        id:
          data.id,

        code:
          data.code

      })
    );


    console.log(
      "クラウド対局作成成功:",
      data
    );


    alert(
      `対局コード：${data.code}`
    );


    return data;

  }


  alert(
    "対局コードを作成できませんでした。もう一度試してください。"
  );

}


// ========================================
// ︙メニューにクラウド対局作成を追加
// ========================================

const cloudMenuObserverV1 =
  new MutationObserver(
    () => {

      const menu =
        document.getElementById(
          "simple-game-menu-v1"
        );


      if (
        !menu
        ||
        document.getElementById(
          "create-cloud-match-v1"
        )
      ) {

        return;

      }


      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";

      button.id =
        "create-cloud-match-v1";

      button.textContent =
        "クラウド対局を作成";


      button.onclick =
        async () => {

          await createCloudMatchV1();

        };


      menu.prepend(
        button
      );

    }
  );


cloudMenuObserverV1.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);
// ========================================
// 6桁コードでクラウド対局に参加 Ver.1
// ========================================

function buildLocalSaveFromCloudStateV1(
  cloudState
) {

  return {

    version:
      1,

    currentPlayers: {
      ...(cloudState.currentPlayers || {})
    },

    dealerPosition:
      cloudState.dealerPosition,

    initialRanks: {
      ...(cloudState.initialRanks || {})
    },

    gameState: {

      scores: {
        ...(cloudState.gameState?.scores || {})
      },

      riichi: {
        ...(cloudState.gameState?.riichi || {})
      },

      kyotaku:
        Number(
          cloudState.gameState?.kyotaku
          || 0
        ),

      honba:
        Number(
          cloudState.gameState?.honba
          || 0
        ),

      roundWind:
        cloudState.gameState?.roundWind
        || "東",

      handNumber:
        Number(
          cloudState.gameState?.handNumber
          || 1
        )

    },

    savedAt:
      new Date().toISOString()

  };

}


async function joinCloudMatchByCodeV1(
  inputCode
) {

  const client =
    window.mahjongSupabaseV1;

  const userId =
    window.mahjongCloudUserIdV1;


  if (
    !client
    ||
    !userId
  ) {

    alert(
      "クラウド接続がまだ完了していません。"
    );

    return;

  }


  const code =
    String(
      inputCode
    )
      .trim();


  if (
    !/^[0-9]{6}$/.test(
      code
    )
  ) {

    alert(
      "6桁の数字を入力してください。"
    );

    return;

  }


  const {
    data,
    error
  } =
    await client.rpc(
      "join_match_by_code",
      {
        p_code:
          code
      }
    );


  if (
    error
  ) {

    console.error(
      "クラウド対局参加エラー:",
      error
    );

    alert(
      "対局が見つからないか、参加できませんでした。"
    );

    return;

  }


  const match =
    Array.isArray(data)
      ? data[0]
      : data;


  if (
    !match
    ||
    !match.id
    ||
    !match.state
  ) {

    alert(
      "対局データを取得できませんでした。"
    );

    return;

  }


  window.mahjongCloudMatchIdV1 =
    match.id;

  window.mahjongCloudMatchCodeV1 =
    match.code;


  localStorage.setItem(
    "MahjongScoreApp_cloud_match_v1",
    JSON.stringify({

      id:
        match.id,

      code:
        match.code

    })
  );


  const localSave =
    buildLocalSaveFromCloudStateV1(
      match.state
    );


  localStorage.setItem(
    LOCAL_MATCH_SAVE_KEY_V1,
    JSON.stringify(
      localSave
    )
  );


  /*
    既に完成しているローカル復旧処理を使って
    クラウドの状態を画面へ反映する。
  */
  if (typeof closeSimpleHomeV1 === "function") {
    closeSimpleHomeV1();
  }


  const restored =
    restoreLocalMatchV1();


  if (
    !restored
  ) {

    alert(
      "対局データの画面反映に失敗しました。"
    );

    return;

  }


  if (typeof startCloudRealtimeSyncV1 === "function") {
    await startCloudRealtimeSyncV1();
  }

  if (typeof updateCloudCodeBadgeV1 === "function") {
    updateCloudCodeBadgeV1();
  }


  console.log(
    "クラウド対局参加成功:",
    match
  );


  if (
    typeof showUndoToastV2
    === "function"
  ) {

    showUndoToastV2(
      `対局 ${match.code} に参加しました`
    );

  } else {

    alert(
      `対局 ${match.code} に参加しました`
    );

  }

}


// ========================================
// 最初の設定画面に
// 「6桁コードで参加」を追加
// ========================================

function installCloudJoinButtonV1() {

  if (
    document.getElementById(
      "join-cloud-match-v1"
    )
  ) {

    return;

  }


  const confirmButton =
    document.getElementById(
      "go-confirm-button"
    );


  if (
    !confirmButton
  ) {

    return;

  }


  const button =
    document.createElement(
      "button"
    );


  button.id =
    "join-cloud-match-v1";

  button.type =
    "button";

  button.textContent =
    "6桁コードで対局に参加";

  button.className =
    "secondary-button";


  button.style.cssText = `
    display: block;
    margin: 10px auto 0;
    min-width: 260px;
  `;


  button.onclick =
    async () => {

      const code =
        window.prompt(
          "6桁の対局コードを入力してください"
        );


      if (
        code === null
      ) {

        return;

      }


      await joinCloudMatchByCodeV1(
        code
      );

    };


  confirmButton.insertAdjacentElement(
    "afterend",
    button
  );

}


installCloudJoinButtonV1();
// ========================================
// クラウド対局 リアルタイム同期 Ver.1
// ========================================

let cloudSyncMatchIdV1 =
  null;

let cloudSyncChannelV1 =
  null;

let cloudSyncApplyingRemoteV1 =
  false;

let cloudSyncLastHashV1 =
  "";

let cloudSyncUploadingV1 =
  false;


function getCloudStateHashV1(
  state
) {

  return JSON.stringify(
    state
  );

}


function applyCloudStateToGameV1(
  cloudState
) {

  if (
    !cloudState
    ||
    !cloudState.currentPlayers
    ||
    !cloudState.gameState
  ) {

    return;

  }


  cloudSyncApplyingRemoteV1 =
    true;


  try {

    currentPlayers = {
      ...cloudState.currentPlayers
    };


    dealerPosition =
      cloudState.dealerPosition;


    initialRanks = {
      ...(cloudState.initialRanks || {})
    };


    positions.forEach(
      (position) => {

        if (
          typeof cloudState.gameState
            .scores?.[position]
          ===
          "number"
        ) {

          gameState.scores[
            position
          ] =
            cloudState.gameState
              .scores[position];

        }


        gameState.riichi[
          position
        ] =
          Boolean(
            cloudState.gameState
              .riichi?.[position]
          );


        const nameElement =
          document.getElementById(
            `game-name-${position}`
          );


        if (
          nameElement
        ) {

          nameElement.textContent =
            currentPlayers[
              position
            ];

        }

      }
    );


    gameState.kyotaku =
      Number(
        cloudState.gameState
          .kyotaku
        || 0
      );


    gameState.honba =
      Number(
        cloudState.gameState
          .honba
        || 0
      );


    gameState.roundWind =
      cloudState.gameState
        .roundWind
      || "東";


    gameState.handNumber =
      Number(
        cloudState.gameState
          .handNumber
        || 1
      );


    /*
      端末側にも最新状態を保存
    */
    const localSave =
      buildLocalSaveFromCloudStateV1(
        cloudState
      );


    localStorage.setItem(
      LOCAL_MATCH_SAVE_KEY_V1,
      JSON.stringify(
        localSave
      )
    );


    if (
      typeof updateDealerAndSeatWinds
      === "function"
    ) {

      updateDealerAndSeatWinds();

    }


    if (
      typeof updateGameUI
      === "function"
    ) {

      updateGameUI();

    }


    if (
      typeof updateRoundDisplay
      === "function"
    ) {

      updateRoundDisplay();

    }


    if (
      typeof updateStartingDealerMarkerV1
      === "function"
    ) {

      updateStartingDealerMarkerV1();

    }


    /*
      ローカル自動保存側にも
      「この状態は保存済み」と伝える
    */
    if (
      typeof buildLocalMatchSaveV1
      === "function"
    ) {

      lastLocalSaveHashV1 =
        JSON.stringify(
          buildLocalMatchSaveV1()
        );

    }


    console.log(
      "クラウド状態を反映しました"
    );

  } finally {

    cloudSyncApplyingRemoteV1 =
      false;

  }

}


async function uploadCurrentStateToCloudV1() {

  if (
    cloudSyncApplyingRemoteV1
    ||
    cloudSyncUploadingV1
    ||
    !cloudSyncMatchIdV1
    ||
    !window.mahjongSupabaseV1
    ||
    typeof buildLocalMatchSaveV1
      !== "function"
  ) {

    return;

  }


  if (
    typeof isGameActiveForLocalSaveV1
      === "function"
    &&
    !isGameActiveForLocalSaveV1()
  ) {

    return;

  }


  const state =
    buildLocalMatchSaveV1();


  const hash =
    getCloudStateHashV1(
      state
    );


  if (
    hash ===
    cloudSyncLastHashV1
  ) {

    return;

  }


  cloudSyncUploadingV1 =
    true;


  try {

    const {
      error
    } =
      await window
        .mahjongSupabaseV1
        .from(
          "matches"
        )
        .update({

          state:
            state

        })
        .eq(
          "id",
          cloudSyncMatchIdV1
        );


    if (
      error
    ) {

      console.error(
        "クラウド同期送信エラー:",
        error
      );

      return;

    }


    cloudSyncLastHashV1 =
      hash;


    console.log(
      "クラウドへ状態送信"
    );

  } finally {

    cloudSyncUploadingV1 =
      false;

  }

}


async function startCloudRealtimeSyncV1(
  matchInfo
) {

  const client =
    window.mahjongSupabaseV1;


  if (
    !client
    ||
    !matchInfo
    ||
    !matchInfo.id
  ) {

    return;

  }


  if (
    cloudSyncMatchIdV1
    ===
    matchInfo.id
  ) {

    return;

  }


  /*
    前のRealtime接続があれば解除
  */
  if (
    cloudSyncChannelV1
  ) {

    try {

      await client.removeChannel(
        cloudSyncChannelV1
      );

    } catch (
      error
    ) {

      console.warn(
        "旧Realtime解除:",
        error
      );

    }

  }


  cloudSyncMatchIdV1 =
    matchInfo.id;


  window.mahjongCloudMatchIdV1 =
    matchInfo.id;

  window.mahjongCloudMatchCodeV1 =
    matchInfo.code;


  /*
    まずクラウドの最新版を取得
  */
  const {
    data:
      latestMatch,
    error:
      loadError
  } =
    await client
      .from(
        "matches"
      )
      .select(
        "id, code, state, version, status"
      )
      .eq(
        "id",
        matchInfo.id
      )
      .single();


  if (
    loadError
  ) {

    console.error(
      "クラウド最新版取得エラー:",
      loadError
    );

    return;

  }


  if (
    latestMatch?.state
  ) {

    applyCloudStateToGameV1(
      latestMatch.state
    );


    cloudSyncLastHashV1 =
      getCloudStateHashV1(
        latestMatch.state
      );

  }


  /*
    他端末からUPDATEされたら受信
  */
  cloudSyncChannelV1 =
    client
      .channel(
        `mahjong-match-${matchInfo.id}`
      )
      .on(
        "postgres_changes",
        {
          event:
            "UPDATE",

          schema:
            "public",

          table:
            "matches",

          filter:
            `id=eq.${matchInfo.id}`
        },
        (payload) => {

          const remoteState =
            payload.new?.state;


          if (
            !remoteState
          ) {

            return;

          }


          const remoteHash =
            getCloudStateHashV1(
              remoteState
            );


          /*
            自分が送ったものと同じなら
            反映し直さない
          */
          if (
            remoteHash ===
            getCloudStateHashV1(
              buildLocalMatchSaveV1()
            )
          ) {

            cloudSyncLastHashV1 =
              remoteHash;

            return;

          }


          cloudSyncLastHashV1 =
            remoteHash;


          applyCloudStateToGameV1(
            remoteState
          );

        }
      )
      .subscribe(
        (status) => {

          console.log(
            "Realtime:",
            status
          );


          if (
            status ===
            "SUBSCRIBED"
          ) {

            if (
              typeof showUndoToastV2
              === "function"
            ) {

              showUndoToastV2(
                "リアルタイム同期ON"
              );

            }

          }

        }
      );

}


// ========================================
// 保存済みのクラウド対局を自動検出
// ========================================

setInterval(
  async () => {

    if (
      !window.mahjongSupabaseV1
      ||
      !window.mahjongCloudUserIdV1
    ) {

      return;

    }


    let saved =
      null;


    try {

      saved =
        JSON.parse(
          localStorage.getItem(
            "MahjongScoreApp_cloud_match_v1"
          )
        );

    } catch (
      error
    ) {

      return;

    }


    if (
      saved?.id
      &&
      cloudSyncMatchIdV1
        !== saved.id
    ) {

      await startCloudRealtimeSyncV1(
        saved
      );

    }

  },
  500
);


// ========================================
// ローカルの確定状態に変化があれば
// クラウドへ送信
// ========================================

setInterval(
  () => {

    uploadCurrentStateToCloudV1();

  },
  500
);
/* ========================================
   クラウド同期 競合防止 Ver.2
   ・ローカル操作時だけ送信
   ・version一致時だけUPDATE
   ・古い端末からの上書きを防止
======================================== */

let cloudSyncServerVersionV2 = 0;

let cloudSyncLocalDirtyV2 = false;


/* ========================================
   ユーザーが実際に操作した時だけ
   「クラウドへ送る必要あり」にする
======================================== */

document.addEventListener(
  "click",
  () => {

    if (
      cloudSyncApplyingRemoteV1
      ||
      !cloudSyncMatchIdV1
    ) {

      return;

    }


    cloudSyncLocalDirtyV2 =
      true;

  },
  true
);


/* ========================================
   クラウドへ送信 Ver.2
======================================== */

uploadCurrentStateToCloudV1 =
  async function () {

    if (
      !cloudSyncLocalDirtyV2
      ||
      cloudSyncApplyingRemoteV1
      ||
      cloudSyncUploadingV1
      ||
      !cloudSyncMatchIdV1
      ||
      !window.mahjongSupabaseV1
      ||
      typeof buildLocalMatchSaveV1
        !== "function"
    ) {

      return;

    }


    if (
      typeof isGameActiveForLocalSaveV1
        === "function"
      &&
      !isGameActiveForLocalSaveV1()
    ) {

      return;

    }


    const state =
      buildLocalMatchSaveV1();


    const hash =
      getCloudStateHashV1(
        state
      );


    /*
      実際には状態が変わっていない
      メニュー操作など
    */
    if (
      hash ===
      cloudSyncLastHashV1
    ) {

      cloudSyncLocalDirtyV2 =
        false;

      return;

    }


    cloudSyncUploadingV1 =
      true;


    try {

      const expectedVersion =
        Number(
          cloudSyncServerVersionV2
          || 0
        );


      const {
        data,
        error
      } =
        await window
          .mahjongSupabaseV1
          .from(
            "matches"
          )
          .update({

            state:
              state

          })
          .eq(
            "id",
            cloudSyncMatchIdV1
          )
          .eq(
            "version",
            expectedVersion
          )
          .select(
            "id, state, version"
          );


      if (
        error
      ) {

        console.error(
          "クラウド同期送信エラー Ver.2:",
          error
        );

        return;

      }


      /*
        UPDATEが0件
        =
        自分が操作している間に
        他端末が先に更新した
      */
      if (
        !data
        ||
        data.length === 0
      ) {

        console.warn(
          "クラウド同期競合を検出"
        );


        const {
          data:
            latest,
          error:
            latestError
        } =
          await window
            .mahjongSupabaseV1
            .from(
              "matches"
            )
            .select(
              "id, state, version"
            )
            .eq(
              "id",
              cloudSyncMatchIdV1
            )
            .single();


        if (
          latestError
        ) {

          console.error(
            "競合後の最新版取得エラー:",
            latestError
          );

          return;

        }


        cloudSyncServerVersionV2 =
          Number(
            latest.version
            || 0
          );


        cloudSyncLastHashV1 =
          getCloudStateHashV1(
            latest.state
          );


        cloudSyncLocalDirtyV2 =
          false;


        applyCloudStateToGameV1(
          latest.state
        );


        if (
          typeof showUndoToastV2
          === "function"
        ) {

          showUndoToastV2(
            "他端末の操作を反映しました"
          );

        }


        return;

      }


      const updated =
        data[0];


      cloudSyncServerVersionV2 =
        Number(
          updated.version
          || expectedVersion + 1
        );


      cloudSyncLastHashV1 =
        hash;


      cloudSyncLocalDirtyV2 =
        false;


      console.log(
        "クラウドへ状態送信 Ver.2",
        cloudSyncServerVersionV2
      );


    } finally {

      cloudSyncUploadingV1 =
        false;

    }

  };


/* ========================================
   Realtime開始 Ver.2
======================================== */

startCloudRealtimeSyncV1 =
  async function (
    matchInfo
  ) {

    const client =
      window.mahjongSupabaseV1;


    if (
      !client
      ||
      !matchInfo
      ||
      !matchInfo.id
    ) {

      return;

    }


    if (
      cloudSyncChannelV1
    ) {

      try {

        await client.removeChannel(
          cloudSyncChannelV1
        );

      } catch (
        error
      ) {

        console.warn(
          error
        );

      }

    }


    cloudSyncMatchIdV1 =
      matchInfo.id;


    window.mahjongCloudMatchIdV1 =
      matchInfo.id;


    window.mahjongCloudMatchCodeV1 =
      matchInfo.code;


    const {
      data:
        latestMatch,
      error:
        loadError
    } =
      await client
        .from(
          "matches"
        )
        .select(
          "id, code, state, version, status"
        )
        .eq(
          "id",
          matchInfo.id
        )
        .single();


    if (
      loadError
    ) {

      console.error(
        "クラウド最新版取得エラー Ver.2:",
        loadError
      );

      return;

    }


    cloudSyncServerVersionV2 =
      Number(
        latestMatch.version
        || 0
      );


    if (
      latestMatch.state
    ) {

      applyCloudStateToGameV1(
        latestMatch.state
      );


      cloudSyncLastHashV1 =
        getCloudStateHashV1(
          latestMatch.state
        );

    }


    cloudSyncLocalDirtyV2 =
      false;


    cloudSyncChannelV1 =
      client
        .channel(
          `mahjong-match-v2-${matchInfo.id}`
        )
        .on(
          "postgres_changes",
          {

            event:
              "UPDATE",

            schema:
              "public",

            table:
              "matches",

            filter:
              `id=eq.${matchInfo.id}`

          },
          (payload) => {

            const remoteState =
              payload.new?.state;


            const remoteVersion =
              Number(
                payload.new?.version
                || 0
              );


            if (
              !remoteState
            ) {

              return;

            }


            /*
              古いRealtimeイベントは無視
            */
            if (
              remoteVersion
              <=
              cloudSyncServerVersionV2
            ) {

              return;

            }


            cloudSyncServerVersionV2 =
              remoteVersion;


            const remoteHash =
              getCloudStateHashV1(
                remoteState
              );


            const localHash =
              getCloudStateHashV1(
                buildLocalMatchSaveV1()
              );


            /*
              自分が送った内容なら
              UIを触り直さない
            */
            if (
              remoteHash
              ===
              localHash
            ) {

              cloudSyncLastHashV1 =
                remoteHash;

              cloudSyncLocalDirtyV2 =
                false;

              return;

            }


            cloudSyncLastHashV1 =
              remoteHash;


            cloudSyncLocalDirtyV2 =
              false;


            applyCloudStateToGameV1(
              remoteState
            );

          }
        )
        .subscribe(
          (status) => {

            console.log(
              "Realtime Ver.2:",
              status
            );


            if (
              status ===
              "SUBSCRIBED"
              &&
              typeof showUndoToastV2
                === "function"
            ) {

              showUndoToastV2(
                "リアルタイム同期ON"
              );

            }

          }
        );

  };
  /* ========================================
   クラウド対局コード常時表示 Ver.1
======================================== */

function getCurrentCloudMatchCodeV1() {

  if (
    window.mahjongCloudMatchCodeV1
  ) {

    return String(
      window.mahjongCloudMatchCodeV1
    );

  }


  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          "MahjongScoreApp_cloud_match_v1"
        )
      );


    if (
      saved
      &&
      saved.code
    ) {

      return String(
        saved.code
      );

    }

  } catch (
    error
  ) {

    console.warn(
      "クラウド対局コード読込エラー:",
      error
    );

  }


  return "";

}


function ensureCloudCodeBadgeV1() {

  let badge =
    document.getElementById(
      "cloud-match-code-badge-v1"
    );


  if (
    badge
  ) {

    return badge;

  }


  badge =
    document.createElement(
      "button"
    );


  badge.id =
    "cloud-match-code-badge-v1";

  badge.type =
    "button";


  badge.style.cssText = `
    position: fixed;
    top: 62px;
    left: 16px;
    z-index: 9000;

    display: none;
    align-items: center;
    gap: 7px;

    padding: 8px 12px;

    border: 1px solid rgba(255,255,255,0.28);
    border-radius: 999px;

    background: rgba(15, 50, 42, 0.92);
    color: white;

    font-size: 14px;
    font-weight: 800;
    letter-spacing: 1px;

    box-shadow: 0 5px 16px rgba(0,0,0,0.25);

    cursor: pointer;
  `;


  badge.onclick =
    async () => {

      const code =
        getCurrentCloudMatchCodeV1();


      if (
        !code
      ) {

        return;

      }


      try {

        await navigator.clipboard
          .writeText(
            code
          );


        if (
          typeof showUndoToastV2
          === "function"
        ) {

          showUndoToastV2(
            `対局コード ${code} をコピーしました`
          );

        }

      } catch (
        error
      ) {

        window.prompt(
          "対局コード",
          code
        );

      }

    };


  document.body.appendChild(
    badge
  );


  return badge;

}


function updateCloudCodeBadgeV1() {

  const badge =
    ensureCloudCodeBadgeV1();


  const code =
    getCurrentCloudMatchCodeV1();


  const gameIsActive =
    typeof gameScreen !== "undefined"
    &&
    gameScreen
    &&
    gameScreen.classList.contains(
      "active"
    );


  if (
    !code
    ||
    !gameIsActive
  ) {

    badge.style.display =
      "none";

    return;

  }


  badge.textContent =
    `☁ ${code}`;


  badge.style.display =
    "flex";

}


/*
  クラウド対局作成・参加・再読込など
  どのタイミングでも表示を追従
*/
setInterval(
  updateCloudCodeBadgeV1,
  300
);
/* ========================================
   クラウド対局 終了同期 Ver.2
   ・終了状態と最終結果をクラウドへ保存
   ・参加中の全端末を同じ結果画面へ移動
   ・終了後は古い6桁対局から切り離す
======================================== */

function getCloudMatchInfoForFinishV2() {

  let id =
    window.mahjongCloudMatchIdV1
    || null;

  let code =
    window.mahjongCloudMatchCodeV1
    || null;


  if (
    !id
    ||
    !code
  ) {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            "MahjongScoreApp_cloud_match_v1"
          )
        );


      if (
        saved
      ) {

        id =
          id
          || saved.id
          || null;

        code =
          code
          || saved.code
          || null;

      }

    } catch (
      error
    ) {

      console.warn(
        "クラウド対局情報読込エラー Ver.2:",
        error
      );

    }

  }


  return {
    id,
    code
  };

}


function readLatestFinishedResultCloudV2() {

  try {

    const raw =
      localStorage.getItem(
        FINISHED_MATCH_KEY_V1
      );


    if (
      !raw
    ) {

      return null;

    }


    const result =
      JSON.parse(
        raw
      );


    if (
      !result
      ||
      !Array.isArray(
        result.players
      )
    ) {

      return null;

    }


    return result;

  } catch (
    error
  ) {

    console.warn(
      "最終結果読込エラー Ver.2:",
      error
    );

    return null;

  }

}


function buildCloudFinishedStateV2(
  finalResult,
  finishMode
) {

  let baseState =
    {};


  try {

    if (
      typeof buildLocalMatchSaveV1
      === "function"
    ) {

      baseState =
        buildLocalMatchSaveV1();

    }

  } catch (
    error
  ) {

    console.warn(
      "終了状態作成時の対局データ取得エラー:",
      error
    );

  }


  return {

    ...baseState,

    cloudMeta: {

      status:
        "finished",

      finishMode:
        finishMode,

      finishedAt:
        new Date()
          .toISOString(),

      finalResult:
        finalResult
        || null

    }

  };

}


async function detachCloudBindingLocalV2() {

  localStorage.removeItem(
    "MahjongScoreApp_cloud_match_v1"
  );


  window.mahjongCloudMatchIdV1 =
    null;

  window.mahjongCloudMatchCodeV1 =
    null;


  cloudSyncMatchIdV1 =
    null;

  cloudSyncLastHashV1 =
    "";

  cloudSyncLocalDirtyV2 =
    false;

  cloudSyncUploadingV1 =
    false;

  cloudSyncServerVersionV2 =
    0;


  const channel =
    cloudSyncChannelV1;


  cloudSyncChannelV1 =
    null;


  if (
    channel
    &&
    window.mahjongSupabaseV1
  ) {

    try {

      await window
        .mahjongSupabaseV1
        .removeChannel(
          channel
        );

    } catch (
      error
    ) {

      console.warn(
        "Realtime解除エラー Ver.2:",
        error
      );

    }

  }


  if (
    typeof updateCloudCodeBadgeV1
    === "function"
  ) {

    updateCloudCodeBadgeV1();

  }

}


function closeCloudRemoteInputUIV2() {

  try {

    if (
      typeof closeSimpleGameMenuV1
      === "function"
    ) {

      closeSimpleGameMenuV1();

    }

  } catch (
    error
  ) {
  }


  try {

    if (
      typeof closeMatchEndDialogV1
      === "function"
    ) {

      closeMatchEndDialogV1();

    }

  } catch (
    error
  ) {
  }


  try {

    if (
      typeof closePointCorrectionV1
      === "function"
      &&
      typeof pointCorrectionV1
      !== "undefined"
      &&
      pointCorrectionV1.active
    ) {

      closePointCorrectionV1();

    }

  } catch (
    error
  ) {
  }


  try {

    if (
      typeof agariFlow
      !== "undefined"
    ) {

      agariFlow.active =
        false;

      agariFlow.committed =
        false;

      agariFlow.pendingMovement =
        null;

    }


    if (
      typeof agariOverlay
      !== "undefined"
      &&
      agariOverlay
    ) {

      agariOverlay
        .classList
        .add(
          "hidden"
        );

    }


    if (
      typeof agariCancelButton
      !== "undefined"
      &&
      agariCancelButton
    ) {

      agariCancelButton.style.display =
        "";

    }

  } catch (
    error
  ) {
  }


  try {

    if (
      typeof ryuukyokuFlowV1
      !== "undefined"
      &&
      ryuukyokuFlowV1.active
      &&
      typeof closeRyuukyokuFlowV1
      === "function"
    ) {

      closeRyuukyokuFlowV1();

    }

  } catch (
    error
  ) {
  }

}


async function finishCloudMatchAndBroadcastV2(
  finalResult,
  finishMode = "result"
) {

  const info =
    getCloudMatchInfoForFinishV2();


  const matchId =
    info.id;


  if (
    !matchId
  ) {

    await detachCloudBindingLocalV2();

    return;

  }


  const client =
    window.mahjongSupabaseV1;


  if (
    !client
  ) {

    console.warn(
      "クラウド接続がないため終了通知を送信できませんでした。"
    );

    await detachCloudBindingLocalV2();

    return;

  }


  const finishedState =
    buildCloudFinishedStateV2(
      finalResult,
      finishMode
    );


  try {

    const {
      data,
      error
    } =
      await client
        .from(
          "matches"
        )
        .update({

          state:
            finishedState,

          status:
            "finished"

        })
        .eq(
          "id",
          matchId
        )
        .select(
          "id, version, status"
        );


    if (
      error
    ) {

      console.error(
        "クラウド対局終了通知エラー Ver.2:",
        error
      );

    } else if (
      !data
      ||
      data.length === 0
    ) {

      console.warn(
        "クラウド対局終了通知の更新対象がありませんでした。"
      );

    } else {

      console.log(
        "クラウド対局終了を全端末へ通知しました",
        data[0]
      );

    }

  } finally {

    /*
      UPDATE完了後なら、他端末へのRealtime通知は
      サーバー側から配信されるため、この端末は切断してよい。
    */
    await detachCloudBindingLocalV2();

  }

}


async function handleCloudFinishedMatchV2(
  matchRow
) {

  const cloudMeta =
    matchRow?.state?.cloudMeta
    || {};


  const finishMode =
    cloudMeta.finishMode
    || "result";


  const finalResult =
    cloudMeta.finalResult
    || null;


  cloudSyncApplyingRemoteV1 =
    true;


  try {

    closeCloudRemoteInputUIV2();


    if (
      finishMode === "result"
      &&
      finalResult
      &&
      Array.isArray(
        finalResult.players
      )
    ) {

      localStorage.setItem(
        FINISHED_MATCH_KEY_V1,
        JSON.stringify(
          finalResult
        )
      );


      if (
        typeof clearActiveMatchStorageV1
        === "function"
      ) {

        clearActiveMatchStorageV1();

      }


      if (
        typeof renderFinalResultV1
        === "function"
      ) {

        renderFinalResultV1(
          finalResult
        );

      }


      if (
        typeof showUndoToastV2
        === "function"
      ) {

        setTimeout(
          () => {

            showUndoToastV2(
              "対局終了を同期しました"
            );

          },
          100
        );

      }

    } else {

      if (
        typeof clearActiveMatchStorageV1
        === "function"
      ) {

        clearActiveMatchStorageV1();

      }


      if (
        typeof showSimpleHomeV1
        === "function"
      ) {

        showSimpleHomeV1();

      }

    }

  } finally {

    cloudSyncApplyingRemoteV1 =
      false;


    await detachCloudBindingLocalV2();

  }

}


/* ========================================
   Realtime開始 Ver.3
   finished を受信したら全端末を終了画面へ
======================================== */

startCloudRealtimeSyncV1 =
  async function (
    matchInfo
  ) {

    const client =
      window.mahjongSupabaseV1;


    if (
      !client
      ||
      !matchInfo
      ||
      !matchInfo.id
    ) {

      return;

    }


    if (
      cloudSyncChannelV1
    ) {

      try {

        await client.removeChannel(
          cloudSyncChannelV1
        );

      } catch (
        error
      ) {

        console.warn(
          "旧Realtime解除 Ver.3:",
          error
        );

      }

    }


    cloudSyncMatchIdV1 =
      matchInfo.id;


    window.mahjongCloudMatchIdV1 =
      matchInfo.id;


    window.mahjongCloudMatchCodeV1 =
      matchInfo.code;


    const {
      data:
        latestMatch,
      error:
        loadError
    } =
      await client
        .from(
          "matches"
        )
        .select(
          "id, code, state, version, status"
        )
        .eq(
          "id",
          matchInfo.id
        )
        .single();


    if (
      loadError
    ) {

      console.error(
        "クラウド最新版取得エラー Ver.3:",
        loadError
      );

      return;

    }


    cloudSyncServerVersionV2 =
      Number(
        latestMatch.version
        || 0
      );


    if (
      latestMatch.status
      === "finished"
    ) {

      await handleCloudFinishedMatchV2(
        latestMatch
      );

      return;

    }


    if (
      latestMatch.state
    ) {

      applyCloudStateToGameV1(
        latestMatch.state
      );


      cloudSyncLastHashV1 =
        getCloudStateHashV1(
          latestMatch.state
        );

    }


    cloudSyncLocalDirtyV2 =
      false;


    cloudSyncChannelV1 =
      client
        .channel(
          `mahjong-match-v3-${matchInfo.id}`
        )
        .on(
          "postgres_changes",
          {

            event:
              "UPDATE",

            schema:
              "public",

            table:
              "matches",

            filter:
              `id=eq.${matchInfo.id}`

          },
          (payload) => {

            const remoteVersion =
              Number(
                payload.new?.version
                || 0
              );


            if (
              remoteVersion
              <=
              cloudSyncServerVersionV2
            ) {

              return;

            }


            cloudSyncServerVersionV2 =
              remoteVersion;


            if (
              payload.new?.status
              === "finished"
            ) {

              void handleCloudFinishedMatchV2(
                payload.new
              );

              return;

            }


            const remoteState =
              payload.new?.state;


            if (
              !remoteState
            ) {

              return;

            }


            const remoteHash =
              getCloudStateHashV1(
                remoteState
              );


            const localHash =
              getCloudStateHashV1(
                buildLocalMatchSaveV1()
              );


            if (
              remoteHash
              ===
              localHash
            ) {

              cloudSyncLastHashV1 =
                remoteHash;

              cloudSyncLocalDirtyV2 =
                false;

              return;

            }


            cloudSyncLastHashV1 =
              remoteHash;


            cloudSyncLocalDirtyV2 =
              false;


            applyCloudStateToGameV1(
              remoteState
            );

          }
        )
        .subscribe(
          (status) => {

            console.log(
              "Realtime Ver.3:",
              status
            );


            if (
              status === "SUBSCRIBED"
              &&
              typeof showUndoToastV2
              === "function"
            ) {

              showUndoToastV2(
                "リアルタイム同期ON"
              );

            }

          }
        );

  };


/* ========================================
   通常の自動終局
======================================== */

if (
  typeof finishNormalMatchV3
  === "function"
) {

  const originalFinishNormalMatchCloudV2 =
    finishNormalMatchV3;


  finishNormalMatchV3 =
    function (...args) {

      const result =
        originalFinishNormalMatchCloudV2
          .apply(
            this,
            args
          );


      const finalResult =
        readLatestFinishedResultCloudV2();


      void finishCloudMatchAndBroadcastV2(
        finalResult,
        "result"
      );


      return result;

    };

}


/* ========================================
   メニューから「結果を残して終了」
======================================== */

if (
  typeof finishMatchAndKeepResultV1
  === "function"
) {

  const originalFinishKeepCloudV2 =
    finishMatchAndKeepResultV1;


  finishMatchAndKeepResultV1 =
    function (...args) {

      const result =
        originalFinishKeepCloudV2
          .apply(
            this,
            args
          );


      const finalResult =
        readLatestFinishedResultCloudV2();


      void finishCloudMatchAndBroadcastV2(
        finalResult,
        "result"
      );


      return result;

    };

}


/* ========================================
   「結果を残さず終了」
   キャンセル時は何もしない
======================================== */

if (
  typeof finishMatchAndDiscardV1
  === "function"
) {

  const originalFinishDiscardCloudV2 =
    finishMatchAndDiscardV1;


  finishMatchAndDiscardV1 =
    function (...args) {

      const wasActive =
        gameScreen
        &&
        gameScreen.classList.contains(
          "active"
        );


      const result =
        originalFinishDiscardCloudV2
          .apply(
            this,
            args
          );


      setTimeout(
        () => {

          const stillActive =
            gameScreen
            &&
            gameScreen.classList.contains(
              "active"
            );


          if (
            wasActive
            &&
            !stillActive
          ) {

            void finishCloudMatchAndBroadcastV2(
              null,
              "discard"
            );

          }

        },
        0
      );


      return result;

    };

}


/* ========================================
   新しい対局へ行く時の安全策
   ※サーバーの対局状態は変更せず、
     この端末の古い紐づけだけ解除する
======================================== */

function detachOldCloudBindingBeforeNewMatchV2() {

  void detachCloudBindingLocalV2();

}


if (
  typeof prepareFreshMatchSetupV2
  === "function"
) {

  const originalFreshSetupCloudV2 =
    prepareFreshMatchSetupV2;


  prepareFreshMatchSetupV2 =
    function (...args) {

      detachOldCloudBindingBeforeNewMatchV2();

      return originalFreshSetupCloudV2
        .apply(
          this,
          args
        );

    };

}


if (
  typeof prepareSamePlayersSetupV1
  === "function"
) {

  const originalSamePlayersCloudV2 =
    prepareSamePlayersSetupV1;


  prepareSamePlayersSetupV1 =
    function (...args) {

      detachOldCloudBindingBeforeNewMatchV2();

      return originalSamePlayersCloudV2
        .apply(
          this,
          args
        );

    };

}


// ========================================
// M6 クラウド導線整理 Ver.1
// ホームから「クラウド対局を作る / 6桁コードで参加」へ進める
// ========================================
(() => {
  let cloudCreateFlowV3 = false;
  let cloudCreateBusyV3 = false;

  function removeOldCloudEntrancesV3() {
    const setupJoin = document.getElementById("join-cloud-match-v1");
    if (setupJoin) {
      setupJoin.style.display = "none";
    }

    const menuCreate = document.getElementById("create-cloud-match-v1");
    if (menuCreate) {
      menuCreate.style.display = "none";
    }
  }

  async function finishCloudCreateFlowV3() {
    if (!cloudCreateFlowV3 || cloudCreateBusyV3) {
      return;
    }

    if (!gameScreen || !gameScreen.classList.contains("active")) {
      return;
    }

    cloudCreateBusyV3 = true;

    try {
      const created = await createCloudMatchV1();

      if (created) {
        cloudCreateFlowV3 = false;

        if (typeof startCloudRealtimeSyncV1 === "function") {
          await startCloudRealtimeSyncV1();
        }

        if (typeof updateCloudCodeBadgeV1 === "function") {
          updateCloudCodeBadgeV1();
        }
      }
    } finally {
      cloudCreateBusyV3 = false;
    }
  }

  function installCloudHomeButtonsV3() {
    const card = document.querySelector(
      "#simple-home-overlay-v1 .simple-home-card-v1"
    );

    if (!card) {
      return;
    }

    if (!document.getElementById("home-create-cloud-v3")) {
      const createButton = document.createElement("button");
      createButton.type = "button";
      createButton.id = "home-create-cloud-v3";
      createButton.textContent = "クラウド対局を作る";

      createButton.onclick = () => {
        cloudCreateFlowV3 = true;
        prepareNewMatchSetupV1();
      };

      const newMatchButton =
        document.getElementById("home-new-match-v1");

      if (newMatchButton) {
        newMatchButton.insertAdjacentElement(
          "afterend",
          createButton
        );
      } else {
        card.appendChild(createButton);
      }
    }

    if (!document.getElementById("home-join-cloud-v3")) {
      const joinButton = document.createElement("button");
      joinButton.type = "button";
      joinButton.id = "home-join-cloud-v3";
      joinButton.textContent = "6桁コードで参加";

      joinButton.onclick = async () => {
        const code = window.prompt(
          "6桁の対局コードを入力してください"
        );

        if (code === null) {
          return;
        }

        await joinCloudMatchByCodeV1(code);
      };

      const createButton =
        document.getElementById("home-create-cloud-v3");

      if (createButton) {
        createButton.insertAdjacentElement(
          "afterend",
          joinButton
        );
      } else {
        card.appendChild(joinButton);
      }
    }

    removeOldCloudEntrancesV3();
  }

  const cloudHomeObserverV3 =
    new MutationObserver(() => {
      installCloudHomeButtonsV3();
      removeOldCloudEntrancesV3();
    });

  cloudHomeObserverV3.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  startGameButton.addEventListener(
    "click",
    () => {
      setTimeout(
        finishCloudCreateFlowV3,
        0
      );
    }
  );

  if (typeof startMidMatchFromFormV2 === "function") {
    const originalStartMidMatchFromFormV2 =
      startMidMatchFromFormV2;

    startMidMatchFromFormV2 =
      function (...args) {
        const result =
          originalStartMidMatchFromFormV2.apply(
            this,
            args
          );

        setTimeout(
          finishCloudCreateFlowV3,
          0
        );

        return result;
      };
  }

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.target
        &&
        event.target.id === "new-match-mode-cancel-v2"
      ) {
        cloudCreateFlowV3 = false;
      }
    },
    true
  );

  installCloudHomeButtonsV3();
  removeOldCloudEntrancesV3();
})();


// ========================================
// M6 横画面専用化 Ver.1
// 対応ブラウザでは横向きロックを試みる。
// iPhone Safariでは強制ロック不可のため、CSSガードも併用。
// ========================================
(() => {
  async function tryLandscapeLockV1() {
    try {
      if (
        screen.orientation &&
        typeof screen.orientation.lock === "function"
      ) {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {
      // iPhone Safari等では失敗して正常。
    }
  }

  ["click", "touchend"].forEach((eventName) => {
    document.addEventListener(
      eventName,
      tryLandscapeLockV1,
      { once: true, passive: true }
    );
  });
})();


// ========================================
// M6 iPhone入力フォーカス位置補正 Ver.1
// iOSで入力欄タップ後に画面が大きくずれた場合、
// キーボードを閉じた時に元の位置へ戻す。
// ========================================
(() => {
  let beforeFocusX = 0;
  let beforeFocusY = 0;

  document.addEventListener(
    "focusin",
    (event) => {
      if (
        event.target &&
        (
          event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.tagName === "SELECT"
        )
      ) {
        beforeFocusX = window.scrollX;
        beforeFocusY = window.scrollY;
      }
    },
    true
  );

  document.addEventListener(
    "focusout",
    (event) => {
      if (
        event.target &&
        (
          event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.tagName === "SELECT"
        )
      ) {
        setTimeout(() => {
          window.scrollTo(beforeFocusX, beforeFocusY);
        }, 120);
      }
    },
    true
  );
})();


// ========================================
// M6 PWA 再開時 viewport 復帰 Ver.2
// iOSがホーム画面復帰時に保存したスクロール位置を復元して
// 上余白が残る問題を強制的に原点へ戻す。
// ========================================
(() => {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  function resetPwaViewportV2() {
    try {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ left: 0, top: 0, behavior: "instant" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener("pageshow", () => {
    resetPwaViewportV2();
    setTimeout(resetPwaViewportV2, 50);
    setTimeout(resetPwaViewportV2, 250);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resetPwaViewportV2();
      setTimeout(resetPwaViewportV2, 80);
      setTimeout(resetPwaViewportV2, 300);
    }
  });

  window.addEventListener("load", () => {
    resetPwaViewportV2();
    setTimeout(resetPwaViewportV2, 100);
  });
})();





// ========================================
// M6 実機テスト指摘5項目 修正 Ver.4
// ①途中からクラウド化 ②名前入力次送り ④設定からホーム
// ========================================
(() => {
  function hasCloudBindingV4() {
    return Boolean(
      window.mahjongCloudMatchIdV1 ||
      localStorage.getItem("MahjongScoreApp_cloud_match_v1")
    );
  }

  async function issueCloudCodeMidMatchV4(button) {
    if (hasCloudBindingV4()) {
      const code = window.mahjongCloudMatchCodeV1 || "";
      if (code) {
        alert(`この対局のコード：${code}`);
      } else if (typeof updateCloudCodeBadgeV1 === "function") {
        updateCloudCodeBadgeV1();
      }
      return;
    }

    if (!gameScreen || !gameScreen.classList.contains("active")) {
      alert("対局中に使用してください。");
      return;
    }

    const oldText = button ? button.textContent : "";
    if (button) {
      button.disabled = true;
      button.textContent = "発行中…";
    }

    try {
      const created = await createCloudMatchV1();
      if (!created) return;

      if (typeof startCloudRealtimeSyncV1 === "function") {
        await startCloudRealtimeSyncV1();
      }
      if (typeof updateCloudCodeBadgeV1 === "function") {
        updateCloudCodeBadgeV1();
      }
    } finally {
      if (button && document.body.contains(button)) {
        button.disabled = false;
        button.textContent = oldText || "クラウド番号を発行";
      }
    }
  }

  function installMidMatchCloudButtonV4() {
    const menu = document.getElementById("simple-game-menu-v1");
    if (!menu) return;

    // 旧ボタンは使わず、意味が明確な途中クラウド化ボタンに統一
    const old = document.getElementById("create-cloud-match-v1");
    if (old) old.style.display = "none";

    let button = document.getElementById("midmatch-cloud-code-v4");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = "midmatch-cloud-code-v4";
      menu.prepend(button);
    }

    if (hasCloudBindingV4()) {
      const code = window.mahjongCloudMatchCodeV1 || "";
      button.textContent = code ? `対局コード：${code}` : "クラウド対局中";
    } else {
      button.textContent = "クラウド番号を発行";
    }

    button.onclick = () => issueCloudCodeMidMatchV4(button);
  }

  // Ver.14: MutationObserverは使用しない。
  // メニューを開いた時だけクラウドボタンを取り付ける。
  const originalOpenSimpleGameMenuV14 = openSimpleGameMenuV1;
  openSimpleGameMenuV1 = function (...args) {
    const result = originalOpenSimpleGameMenuV14.apply(this, args);
    installMidMatchCloudButtonV4();
    return result;
  };

  // A(上) → B(右) → C(下) → D(左) → キーボードを閉じる
  const nameOrder = ["name-top", "name-left", "name-bottom", "name-right"];
  nameOrder.forEach((id, index) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.setAttribute("enterkeyhint", index < nameOrder.length - 1 ? "next" : "done");
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();

      const nextId = nameOrder[index + 1];
      if (nextId) {
        const next = document.getElementById(nextId);
        if (next) {
          next.focus();
          next.select();
        }
      } else {
        input.blur();
      }
    });
  });

  const setupHome = document.getElementById("setup-home-button-v4");
  if (setupHome) {
    setupHome.onclick = () => {
      if (typeof showSimpleHomeV1 === "function") {
        showSimpleHomeV1();
      }
    };
  }
})();














// ========================================
// iPhone実機操作安定化 Ver.13
// ========================================
(() => {
  // 「何もない卓面」だけをキャンセル扱いにする。
  // プレイヤーパネル・リーチ・メニュー等の操作UIは除外。
  const interactiveV13 = [
    ".player-panel",
    ".riichi-button",
    "#agari-button",
    "#ryukyoku-button",
    ".top-actions",
    "button",
    "input",
    "select",
    "label",
    ".agari-overlay",
    ".agari-flow-card",
    ".game-menu",
    "#simple-game-menu-v1"
  ].join(",");

  document.addEventListener("pointerup", (event) => {
    if (!agariFlow || !agariFlow.active || agariFlow.committed) return;
    const t = event.target;
    if (!(t instanceof Element)) return;

    // 選択対象や各種UIを押した時は絶対に閉じない。
    if (t.closest(interactiveV13)) return;

    // 卓の背景を直接押した時だけ閉じる。
    if (t.closest("#game-screen")) {
      closeAgariFlow();
    }
  }, false);

  // iOSでホーム/別アプリから復帰した時に白画面化しにくいよう、
  // 復帰時は再描画だけを要求する。DOMの作り直しやresize再発火はしない。
  function repaintV13() {
    document.documentElement.style.setProperty("--resume-tick-v13", String(Date.now()));
    void document.documentElement.offsetHeight;
  }
  window.addEventListener("pageshow", repaintV13);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestAnimationFrame(repaintV13);
    }
  });
})();

// ========================================
// iPhone viewport復帰 Ver.14
// ========================================
(() => {
  function normalizeViewportV14() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  window.addEventListener("pageshow", () => {
    requestAnimationFrame(normalizeViewportV14);
    setTimeout(normalizeViewportV14, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestAnimationFrame(normalizeViewportV14);
      setTimeout(normalizeViewportV14, 120);
    }
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(normalizeViewportV14, 120);
  });
})();



// ========================================
// iPhone実機UI統一 Ver.16
// ========================================
(() => {
  document.addEventListener("pointerup", (event) => {
    if (!agariFlow || !agariFlow.active) return;
    if (agariFlow.step !== "winner" && agariFlow.step !== "discarder") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const riichi = target.closest(".riichi-button");
    if (!riichi) return;
    const panel = riichi.closest(".player-panel");
    if (!panel) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const position = panel.dataset.position;
    if (agariFlow.step === "winner") handleWinnerSelection(position);
    else handleDiscarderSelection(position);
  }, true);

  function forceViewportV16() {
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.documentElement.scrollLeft=0;
    document.body.scrollTop=0;
    document.body.scrollLeft=0;
    document.documentElement.style.height="100%";
    document.body.style.height="100%";
    void document.body.offsetHeight;
  }
  function runViewportFixV16() {
    requestAnimationFrame(forceViewportV16);
    [50,150,350,700,1200].forEach(ms=>setTimeout(forceViewportV16,ms));
  }
  window.addEventListener("load",runViewportFixV16);
  window.addEventListener("pageshow",runViewportFixV16);
  window.addEventListener("orientationchange",runViewportFixV16);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") runViewportFixV16();
  });
})();

// ========================================
// 途中対局 キーボード次項目 Ver.17
// ========================================
(() => {
  function installMidMatchKeyboardNextV17() {
    const card = document.querySelector(".mid-match-setup-card-v2");
    if (!card) return;

    const fields = Array.from(
      card.querySelectorAll('input:not([type="hidden"]), select')
    ).filter(el => !el.disabled && el.offsetParent !== null);

    fields.forEach((field, index) => {
      if (field.tagName === "INPUT") {
        field.setAttribute("enterkeyhint", index === fields.length - 1 ? "done" : "next");
      }
      if (field.dataset.nextInstalledV17 === "1") return;
      field.dataset.nextInstalledV17 = "1";

      field.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const current = Array.from(
          card.querySelectorAll('input:not([type="hidden"]), select')
        ).filter(el => !el.disabled && el.offsetParent !== null);
        const i = current.indexOf(field);
        const next = current[i + 1];
        if (next) {
          next.focus();
          if (typeof next.select === "function") next.select();
        } else {
          field.blur();
        }
      });
    });
  }

  const observerV17 = new MutationObserver(() => {
    if (document.querySelector(".mid-match-setup-card-v2")) {
      installMidMatchKeyboardNextV17();
    }
  });
  observerV17.observe(document.body, {childList:true, subtree:true});
  document.addEventListener("focusin", () => installMidMatchKeyboardNextV17());
})();


// ========================================
// iPhone PWA viewport補正 Ver.25
// ========================================
(() => {
  function measureViewportV25() {
    const vv = window.visualViewport;
    let width = vv && vv.width > 0 ? vv.width : window.innerWidth;
    let height = vv && vv.height > 0 ? vv.height : window.innerHeight;

    // visualViewport が一時的に縦向き値を返す瞬間は、innerWidth/Height の
    // 横向き値を優先する。screen値は端末物理寸法なので使用しない。
    if (window.innerWidth > window.innerHeight && width < height) {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    if (!(width > 0 && height > 0)) return;
    document.documentElement.style.setProperty("--app-width-v25", `${Math.floor(width)}px`);
    document.documentElement.style.setProperty("--app-height-v25", `${Math.floor(height)}px`);
    window.scrollTo(0, 0);
    document.documentElement.scrollLeft = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollLeft = 0;
    document.body.scrollTop = 0;
  }

  let rafV25 = 0;
  function scheduleViewportV25() {
    cancelAnimationFrame(rafV25);
    rafV25 = requestAnimationFrame(measureViewportV25);
    [80, 250, 600, 1200].forEach(ms => setTimeout(measureViewportV25, ms));
  }

  window.addEventListener("load", scheduleViewportV25);
  window.addEventListener("pageshow", scheduleViewportV25);
  window.addEventListener("orientationchange", scheduleViewportV25);
  window.addEventListener("resize", scheduleViewportV25, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleViewportV25, { passive: true });
    window.visualViewport.addEventListener("scroll", scheduleViewportV25, { passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleViewportV25();
  });
})();

/* ========================================
   M7 手牌撮影フロー Ver.1
   撮影 → プレビュー → この画像を使う
   ======================================== */
(() => {
  let handPhotoObjectUrlM7 = null;

  function closeHandPhotoPreviewM7() {
    const overlay = document.getElementById("hand-photo-preview-m7");
    if (overlay) overlay.remove();
    if (handPhotoObjectUrlM7) {
      URL.revokeObjectURL(handPhotoObjectUrlM7);
      handPhotoObjectUrlM7 = null;
    }
  }

  function openHandCameraM7() {
    let input = document.getElementById("hand-camera-input-m7");
    if (!input) {
      input = document.createElement("input");
      input.id = "hand-camera-input-m7";
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.hidden = true;
      document.body.appendChild(input);

      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        showHandPhotoPreviewM7(file);
        input.value = "";
      });
    }
    input.click();
  }

  function showHandPhotoPreviewM7(file) {
    closeHandPhotoPreviewM7();
    handPhotoObjectUrlM7 = URL.createObjectURL(file);

    const overlay = document.createElement("div");
    overlay.id = "hand-photo-preview-m7";
    overlay.className = "hand-photo-preview-m7";
    overlay.innerHTML = `
      <div class="hand-photo-card-m7" role="dialog" aria-modal="true" aria-label="手牌写真の確認">
        <div class="hand-photo-title-m7">手牌写真を確認</div>
        <div class="hand-photo-guide-m7">13〜14枚すべてが写っていることを確認してください</div>
        <img class="hand-photo-image-m7" alt="撮影した手牌" src="${handPhotoObjectUrlM7}">
        <div class="hand-photo-actions-m7">
          <button type="button" id="cancel-hand-photo-m7">キャンセル</button>
          <button type="button" id="retake-hand-photo-m7">撮り直す</button>
          <button type="button" id="use-hand-photo-m7" class="primary">この画像を使う</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById("cancel-hand-photo-m7").onclick = closeHandPhotoPreviewM7;
    document.getElementById("retake-hand-photo-m7").onclick = () => {
      closeHandPhotoPreviewM7();
      openHandCameraM7();
    };
    document.getElementById("use-hand-photo-m7").onclick = () => {
      // M7 Ver.1では解析器へ渡す入口まで。実牌取得後に切り出し処理を接続する。
      window.mahjongHandPhotoM7 = file;
      closeHandPhotoPreviewM7();
      alert("画像を読み込みました。\n次の工程で牌の切り出し・認識を行います。");
    };
  }

  function installHandCameraButtonM7() {
    const menu = document.getElementById("simple-game-menu-v1");
    if (!menu || document.getElementById("open-hand-camera-m7")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "open-hand-camera-m7";
    button.textContent = "手牌を撮影";

    const pointButton = document.getElementById("open-point-correction-v1");
    if (pointButton) menu.insertBefore(button, pointButton);
    else menu.appendChild(button);

    button.onclick = () => {
      if (typeof closeSimpleGameMenuV1 === "function") closeSimpleGameMenuV1();
      openHandCameraM7();
    };
  }

  const previousOpenMenuM7 = openSimpleGameMenuV1;
  openSimpleGameMenuV1 = function (...args) {
    const result = previousOpenMenuM7.apply(this, args);
    installHandCameraButtonM7();
    return result;
  };
})();

/* ========================================
   M7 手牌候補切り出し Ver.2
   実牌テスト前の土台: 画像をcanvasへ読み込み、牌候補を矩形として抽出する。
   ======================================== */
(() => {
  function loadImageM7V2(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像を読み込めませんでした")); };
      img.src = url;
    });
  }

  function detectTileCandidatesM7V2(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    // 麻雀牌は一般に明るく低彩度。実牌取得後にここを撮影条件に合わせて調整する。
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      if (lum > 135 && (max - min) < 95) mask[p] = 1;
    }

    const seen = new Uint8Array(w * h);
    const comps = [];
    const stack = [];
    const minPixels = Math.max(20, Math.floor(w * h * 0.00035));
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const start = y * w + x;
        if (!mask[start] || seen[start]) continue;
        seen[start] = 1; stack.length = 0; stack.push(start);
        let minX=x,maxX=x,minY=y,maxY=y,count=0;
        while (stack.length) {
          const q = stack.pop(); count++;
          const qx=q%w, qy=(q/w)|0;
          if(qx<minX)minX=qx;if(qx>maxX)maxX=qx;if(qy<minY)minY=qy;if(qy>maxY)maxY=qy;
          const ns=[q-1,q+1,q-w,q+w];
          for(const n of ns){ if(n>=0&&n<mask.length&&mask[n]&&!seen[n]){seen[n]=1;stack.push(n);} }
        }
        if (count < minPixels) continue;
        const bw=maxX-minX+1,bh=maxY-minY+1;
        const area=bw*bh, fill=count/area;
        if (bw < w*0.018 || bh < h*0.10 || bw > w*0.18 || bh > h*0.88) continue;
        if (bh/bw < 0.8 || bh/bw > 3.2 || fill < 0.32) continue;
        comps.push({x:minX,y:minY,w:bw,h:bh,area});
      }
    }
    comps.sort((a,b)=>a.x-b.x);
    return comps.slice(0, 20);
  }

  async function analyzeHandPhotoM7V2(file) {
    const img = await loadImageM7V2(file);
    const maxW = 720;
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const work = document.createElement("canvas"); work.width=w; work.height=h;
    const ctx=work.getContext("2d", {willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const boxes=detectTileCandidatesM7V2(ctx,w,h);

    const overlay=document.createElement("div");
    overlay.className="tile-detect-overlay-m7v2";
    overlay.innerHTML=`<div class="tile-detect-card-m7v2"><div class="tile-detect-head-m7v2"><b>牌候補の切り出し</b><span>${boxes.length}個の候補</span></div><div class="tile-detect-canvas-wrap-m7v2"></div><div class="tile-detect-note-m7v2">※ 今日は検出処理の土台確認です。実牌を使って明日、13〜14枚を正しく囲めるよう調整します。</div><button type="button" class="tile-detect-close-m7v2">閉じる</button></div>`;
    document.body.appendChild(overlay);
    const view=document.createElement("canvas"); view.width=w; view.height=h; view.className="tile-detect-canvas-m7v2";
    const vctx=view.getContext("2d"); vctx.drawImage(img,0,0,w,h);
    vctx.lineWidth=Math.max(2,Math.round(w/300)); vctx.strokeStyle="#ffb000"; vctx.font=`bold ${Math.max(12,Math.round(w/45))}px sans-serif`; vctx.fillStyle="#ffb000";
    boxes.forEach((b,i)=>{vctx.strokeRect(b.x,b.y,b.w,b.h);vctx.fillText(String(i+1),b.x+3,Math.max(14,b.y+16));});
    overlay.querySelector(".tile-detect-canvas-wrap-m7v2").appendChild(view);
    overlay.querySelector(".tile-detect-close-m7v2").onclick=()=>overlay.remove();
  }

  // Ver.1の「この画像を使う」ボタンへ、解析をcapture phaseで接続。
  document.addEventListener("click", (event) => {
    const button=event.target.closest && event.target.closest("#use-hand-photo-m7");
    if(!button) return;
    const file=window.mahjongHandPhotoPendingM7 || null;
    // Ver.1ではfileがクロージャ内なので、プレビュー画像からblob化するフォールバックを使う。
    const img=document.querySelector(".hand-photo-image-m7");
    if(!img) return;
    fetch(img.src).then(r=>r.blob()).then(blob=>analyzeHandPhotoM7V2(blob)).catch(()=>{});
  }, true);
})();

/* ========================================
   M7 リアルタイムカメラ Ver.3
   実牌前の土台: アプリ内にカメラ映像を表示し、認識数UIを重ねる。
   ======================================== */
(() => {
  let streamM7V3 = null;

  function stopRealtimeCameraM7V3() {
    if (streamM7V3) {
      streamM7V3.getTracks().forEach(track => track.stop());
      streamM7V3 = null;
    }
    document.getElementById("realtime-hand-camera-m7v3")?.remove();
  }

  async function openRealtimeCameraM7V3() {
    stopRealtimeCameraM7V3();
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("この端末ではアプリ内カメラを利用できません。HTTPSの公開ページから開いてください。");
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "realtime-hand-camera-m7v3";
    overlay.className = "realtime-hand-camera-m7v3";
    overlay.innerHTML = `
      <video class="realtime-hand-video-m7v3" autoplay playsinline muted></video>
      <div class="realtime-hand-guide-m7v3" aria-hidden="true">
        <div class="realtime-hand-guide-box-m7v3"></div>
      </div>
      <div class="realtime-hand-status-m7v3">
        <b>手牌を枠内に並べてください</b>
        <span id="realtime-hand-count-m7v3">0 / 14</span>
        <small>実牌テスト後、認識できた牌をここで自動カウントします</small>
      </div>
      <button type="button" class="realtime-hand-cancel-m7v3">キャンセル</button>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".realtime-hand-cancel-m7v3").onclick = stopRealtimeCameraM7V3;

    try {
      streamM7V3 = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      const video = overlay.querySelector("video");
      video.srcObject = streamM7V3;
      await video.play().catch(() => {});
    } catch (error) {
      stopRealtimeCameraM7V3();
      alert("カメラを起動できませんでした。カメラの使用を許可して、もう一度お試しください。");
    }
  }

  function installRealtimeCameraButtonM7V3() {
    const menu = document.getElementById("simple-game-menu-v1");
    if (!menu || document.getElementById("open-realtime-hand-camera-m7v3")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "open-realtime-hand-camera-m7v3";
    button.textContent = "手牌を読み取る";
    const photoButton = document.getElementById("open-hand-camera-m7");
    if (photoButton) menu.insertBefore(button, photoButton);
    else menu.appendChild(button);
    button.onclick = () => {
      if (typeof closeSimpleGameMenuV1 === "function") closeSimpleGameMenuV1();
      openRealtimeCameraM7V3();
    };
  }

  const previousOpenMenuM7V3 = openSimpleGameMenuV1;
  openSimpleGameMenuV1 = function (...args) {
    const result = previousOpenMenuM7V3.apply(this, args);
    installRealtimeCameraButtonM7V3();
    return result;
  };

  window.addEventListener("pagehide", () => {
    if (streamM7V3) stopRealtimeCameraM7V3();
  });
})();

/* ========================================
   M7 リアルタイム候補検出 Ver.4
   実牌前の仮検出。映像中の縦長・高コントラスト領域を数え、
   13〜14牌の実牌テスト時に閾値を調整する。
   ======================================== */
(() => {
  let timerM7V4 = null;

  function stopLiveDetectM7V4() {
    if (timerM7V4) clearInterval(timerM7V4);
    timerM7V4 = null;
  }

  function detectCandidatesM7V4(ctx, w, h) {
    const data = ctx.getImageData(0,0,w,h).data;
    const gray = new Uint8Array(w*h);
    for(let i=0,p=0;i<data.length;i+=4,p++) gray[p]=(data[i]*3+data[i+1]*6+data[i+2])/10;
    const mask = new Uint8Array(w*h);
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
      const p=y*w+x;
      const gx=Math.abs(gray[p+1]-gray[p-1]);
      const gy=Math.abs(gray[p+w]-gray[p-w]);
      if(gx+gy>72) mask[p]=1;
    }
    // Count edge density in vertical strips; adjacent active strips are merged.
    const strips=28, sw=w/strips, active=[];
    for(let s=0;s<strips;s++){
      const x0=Math.floor(s*sw), x1=Math.min(w,Math.ceil((s+1)*sw)); let n=0;
      for(let y=Math.floor(h*.12);y<Math.floor(h*.9);y+=2) for(let x=x0;x<x1;x+=2) n+=mask[y*w+x];
      const denom=Math.max(1,Math.ceil((x1-x0)/2)*Math.ceil(h*.78/2));
      if(n/denom>.055) active.push(s);
    }
    const groups=[];
    active.forEach(s=>{const g=groups[groups.length-1]; if(g&&s<=g[1]+1) g[1]=s; else groups.push([s,s]);});
    return groups.filter(g=>g[1]-g[0]<=4).map(g=>({x:g[0]*sw,w:(g[1]-g[0]+1)*sw})).slice(0,14);
  }

  function startLiveDetectM7V4(overlay) {
    stopLiveDetectM7V4();
    const video=overlay.querySelector('.realtime-hand-video-m7v3');
    const count=overlay.querySelector('#realtime-hand-count-m7v3');
    const note=overlay.querySelector('.realtime-hand-status-m7v3 small');
    if(note){note.textContent='仮検出中：実牌テストで13〜14枚に調整します';note.classList.add('live-m7v4');}
    const draw=document.createElement('canvas'); draw.className='realtime-hand-live-canvas-m7v4'; overlay.appendChild(draw);
    const work=document.createElement('canvas'); work.width=320; work.height=150; const wctx=work.getContext('2d',{willReadFrequently:true});
    timerM7V4=setInterval(()=>{
      if(!document.body.contains(overlay)||video.readyState<2) return;
      // approximate the visible guide rectangle used by CSS
      wctx.drawImage(video,0,0,video.videoWidth,video.videoHeight,0,0,320,150);
      const boxes=detectCandidatesM7V4(wctx,320,150);
      count.textContent=`${boxes.length} / 14`;
      draw.width=overlay.clientWidth; draw.height=overlay.clientHeight;
      const d=draw.getContext('2d'); d.clearRect(0,0,draw.width,draw.height);
      const gx=draw.width*.07, gy=draw.height*.17, gw=draw.width*.86, gh=draw.height*.63;
      d.strokeStyle='#ffb000'; d.lineWidth=2;
      boxes.forEach(b=>d.strokeRect(gx+(b.x/320)*gw,gy,Math.max(10,(b.w/320)*gw),gh));
    },500);
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('#open-realtime-hand-camera-m7v3')) return;
    setTimeout(()=>{const overlay=document.getElementById('realtime-hand-camera-m7v3');if(overlay) startLiveDetectM7V4(overlay);},700);
  },true);
  document.addEventListener('click',e=>{if(e.target.closest?.('.realtime-hand-cancel-m7v3')) stopLiveDetectM7V4();},true);
  window.addEventListener('pagehide',stopLiveDetectM7V4);
})();
