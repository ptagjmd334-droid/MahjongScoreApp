// ========================================
// MahjongScoreApp UI追加・改善用
// ========================================

console.log("ui-fixes.js loaded");
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