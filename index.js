import fs from "fs-extra";
import strftime from "strftime";

class App {
  #BASE_URL = "https://www.taptap.io";
  #xua =
    "V=1&PN=WebAppIntl2&LANG=en_US&VN_CODE=114&VN=0.1.0&LOC=CN&PLT=PC&DS=Android&UID=4df88e5d-b4f4-4173-8985-a83672c5d35a&CURR=ID&DT=PC&OS=Linux&OSV=x86_64";
  constructor() {
    this.#start();
  }

  async #start() {
    const apps = await this.#getGame();

    apps.forEach(async (data) => {
      const response = await fetch(
        `${this.#BASE_URL}/webapiv2/i/app/v5/detail?` +
          new URLSearchParams({
            id: data.id,
            "X-UA": this.#xua,
          })
      );

      const content = await response.json();
      const { app } = content.data;

      let i = 0;
      while (true) {
        const reviews = await this.#requestReview({
          app_id: app.id,
          from: i,
          limit: 100,
        });

        if (!reviews) break;

        for (const { post: postIn } of reviews) {
          const response = await fetch(
            `${this.#BASE_URL}/webapiv2/creation/post/v1/detail?` +
              new URLSearchParams({
                id_str: postIn.id_str,
                "X-UA": this.#xua,
              })
          );

          const { data } = await response.json();
          const { post } = data;

          const username = post.user.name.replace("/", "");
          const stat = !Object.keys(post.stat).length ? null : post.stat;

          const rating = postIn.list_fields.app_ratings
            ? postIn.list_fields.app_ratings[app.id].score
            : null;

          const outputFile = `data/${app.title}/${username}.json`;

          this.writeFile(outputFile, {
            link: `${this.#BASE_URL}/app/${app.id}`,
            domain: this.#BASE_URL.split("/")[2],
            tag: `${this.#BASE_URL}/app/${app.id}`.split("/").slice(2),
            crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
            crawling_time_epoch: Date.now(),
            path_data_raw: `data/data_raw/data_review/www.taptap.io/${app.title}/json/${username}.json`,
            path_data_clean: `data/data_clean/data_review/www.taptap.io/${app.title}/json/${username}.json`,
            reviews_name: app.title,
            description_reviews: app.description.text,
            developers_reviews: app.developers.map(
              (developer) => developer.name
            ),
            tags_reviews: app.tags.map((tag) => tag.value),
            location_reviews: null,
            category_reviews: "application",
            total_reviews: app.stat.review_count,
            total_fans: app.stat.fans_count,
            total_user_want: app.stat.user_want_count,
            total_user_played: app.stat.user_played_count,
            total_user_playing: app.stat.user_playing_count,
            reviews_rating: {
              total_rating: parseFloat(app.stat.rating.score),
              detail_total_rating: null,
            },
            review_info: app.stat.vote_info,
            detail_reviews: {
              username_reviews: username,
              gender_reviews: post.user.gender.length ? post.user.gender : null,
              avatar_reviews: post.user.avatar,
              image_reviews: Object.keys(post.files.images),
              created_time: strftime(
                "%Y-%m-%d %H:%M:%S",
                new Date(post.published_time * 1000)
              ),
              created_time_epoch: post.published_time,
              edited_time: strftime(
                "%Y-%m-%d %H:%M:%S",
                new Date(post.edited_time * 1000)
              ),
              edited_time_epoch: post.edited_time,
              email_reviews: null,
              company_name: null,
              location_reviews: null,
              title_detail_reviews: post.title,
              reviews_rating: rating,
              detail_reviews_rating: null,
              total_likes_reviews: stat ? stat.ups | 0 : 0,
              total_dislikes_reviews: null,
              total_reply_reviews: stat ? stat.comments | 0 : 0,
              total_favorites_reviews: stat ? stat.favorites | 0 : 0,
              content_reviews: post.contents.json
                .filter((content) => content.type == "paragraph")
                .map((content) => content.children.map((e) => e.text).join(""))
                .filter((e) => e != "")
                .join("\n"),
              reply_content_reviews: !(stat && stat.comments)
                ? []
                : await this.#getReplys({
                    post_id_str: postIn.id_str,
                  }),

              date_of_experience: null,
              date_of_experience_epoch: null,
            },
          });
          console.log(outputFile);
        }

        // break;
        i += 100;
      }
    });
  }

  async writeFile(outputFile, data) {
    await fs.outputFile(outputFile, JSON.stringify(data, null, 2));
  }

  async #getReplys(payload) {
    const replys = [];
    let i = 0;
    while (true) {
      const response = await fetch(
        `${this.#BASE_URL}/webapiv2/creation/comment/v1/by-post?` +
          new URLSearchParams({
            ...payload,
            from: i,
            limit: 10,
            "X-UA": this.#xua,
          })
      );
      const { data } = await response.json();

      if (!data.list) break;

      replys.push(...data.list);
      i += 10;
    }

    const result = [];
    for (const reply of replys) {
      result.push({
        username_reply_reviews: reply.user.name,
        content_reply_reviews: reply.contents.raw_text,
        image_reply_reviews: reply.images
          ? reply.images.map((image) => image.url)
          : null,
        avatar_reply_reviews: reply.user.avatar,
        gender_reply_reviews: reply.user.gender.length
          ? reply.user.gender
          : null,
        total_likes_reviews: reply.stat.ups,
        total_reply_reviews: reply.stat.comments,
        created_time: strftime(
          "%Y-%m-%d %H:%M:%S",
          new Date(reply.created_time * 1000)
        ),
        created_time_epoch: reply.created_time,
        edited_time: strftime(
          "%Y-%m-%d %H:%M:%S",
          new Date(reply.edited_time * 1000)
        ),
        edited_time_epoch: reply.edited_time,
        child_comments: !reply.child_comments
          ? null
          : await this.#getChild({
              id_str: reply.id,
              limit: reply.stat.comments,
            }),
      });
    }
    return result;
  }

  async #getGame() {
    const response = await fetch(
      `${this.#BASE_URL}/webapiv2/i/sidebar/v1/list?` +
        new URLSearchParams({
          type: "landing",
          "X-UA": this.#xua,
        })
    );

    const { data } = await response.json();
    return await Promise.all(
      data.list[0].data.data.map(async (data) => {
        const response = await fetch(
          `${this.#BASE_URL}/webapiv2/i/app/v5/detail?` +
            new URLSearchParams({
              id: data.app.id,
              "X-UA": this.#xua,
            })
        );
        const content = await response.json();
        return content.data.app;
      })
    );
  }

  async #getChild(payload) {
    const response = await fetch(
      `${this.#BASE_URL}/webapiv2/creation/comment/v1/by-comment?` +
        new URLSearchParams({
          ...payload,
          from: 0,
          "X-UA": this.#xua,
        })
    );
    const { data } = await response.json();
    try {
      return data.list.map((reply) => this.#parserUser(reply));
    } catch (e) {
      return null;
    }
  }

  #parserUser(reply) {
    return {
      username_reply_reviews: reply.user.name,
      content_reply_reviews: reply.contents.raw_text,
      image_reply_reviews: reply.images
        ? reply.images.map((image) => image.url)
        : null,
      avatar_reply_reviews: reply.user.avatar,
      gender_reply_reviews: reply.user.gender.length ? reply.user.gender : null,
      total_likes_reviews: reply.stat.ups,
      total_reply_reviews: reply.stat.comments,
      created_reply_time: reply.published_time,
      created_reply_time_epoch: reply.published_time,
      created_time: strftime(
        "%Y-%m-%d %H:%M:%S",
        new Date(reply.created_time * 1000)
      ),
      created_time_epoch: reply.created_time,
      edited_time: strftime(
        "%Y-%m-%d %H:%M:%S",
        new Date(reply.edited_time * 1000)
      ),
      edited_time_epoch: reply.edited_time,
      a: reply.child_comments,
    };
  }

  /**
   *
   * @param {string} from
   * @param {string} limit
   * @returns
   */
  async #requestReview(params) {
    const response = await fetch(
      `${this.#BASE_URL}/webapiv2/feeds/v1/app-ratings?` +
        new URLSearchParams({
          ...params,
          "X-UA": this.#xua,
        })
    );

    const { data } = await response.json();
    return data.list;
  }
}

new App();
