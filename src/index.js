import fs from "fs-extra";
import strftime from "strftime";
import crypto from "crypto";
import fetch from "node-fetch";
import { writeLog, updateLog, infoLog } from "./utils/logsio.js";
import { uploadS3Json } from "./utils/upload-s3.js";

class Taptap {
  #BASE_URL = "https://www.taptap.io";
  #id_project = crypto.createHash("md5").update(this.#BASE_URL).digest("hex");
  #xua =
    "V=1&PN=WebAppIntl2&LANG=en_US&VN_CODE=114&VN=0.1.0&LOC=CN&PLT=PC&DS=Android&UID=4df88e5d-b4f4-4173-8985-a83672c5d35a&CURR=ID&DT=PC&OS=Linux&OSV=x86_64";
  #platforms = ["android", "ios", "pc"];
  #fileNameLog = "Monitoring data.json";

  constructor() {
    this.#start();
    // this.#process("178299");
  }

  async #start() {
    for (const platform of this.#platforms) {
      let i = 0;
      while (true) {
        const requests = await fetch(
          `${this.#BASE_URL}/webapiv2/i/app-top/v2/hits?` +
            new URLSearchParams({
              from: i,
              limit: 5,
              platform,
              type_name: "hot",
              "X-UA": this.#xua,
            })
        );

        const { data } = await requests.json();

        await Promise.all(
          data.list.map(async ({ app }) => {
            await this.#process(app.id);
          })
        );
        throw new Error("end");

        if (!data.next_page.length) break;
        i += 5;
      }
    }
  }

  async #process(gameId) {
    try {
      const response = await fetch(
        `${this.#BASE_URL}/webapiv2/i/app/v5/detail?` +
          new URLSearchParams({
            id: gameId,
            "X-UA": this.#xua,
          })
      );

      const content = await response.json();
      const { app } = content.data;
      const link = `${this.#BASE_URL}/app/${app.id}`;

      const headers = {
        link,
        domain: this.#BASE_URL.split("/")[2],
        tag: `${this.#BASE_URL}/app/${app.id}`.split("/").slice(2),
        crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
        crawling_time_epoch: Date.now(),
        reviews_name: app.title,
        description_reviews: app.description.text,
        developers_reviews: app.developers.map((developer) => developer.name),
        tags_reviews: app.tags ? app.tags.map((tag) => tag.value) : null,
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
        path_data_raw: `S3://ai-pipeline-statistics/data/data_raw/data_review/taptap_io/${app.title}/json/detail.json`,
        path_data_clean: `S3://ai-pipeline-statistics/data/data_clean/data_review/taptap_io/${app.title}/json/detail.json`,
      };

      const log = {
        Crawlling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
        id_project: null,
        project: "Data Intelligence",
        sub_project: "data review",
        source_name: this.#BASE_URL.split("/")[2],
        sub_source_name: app.title,
        id_sub_source: app.id.toString(),
        total_data: 0,
        total_success: 0,
        total_failed: 0,
        status: "Process",
        assign: "romy",
      };
      writeLog(log);

      console.log("try", app.title);

      let i = 0;
      while (true) {
        const reviews = await this.#requestReview({
          app_id: app.id,
          from: i,
          limit: 50,
        });

        await Promise.all(
          [
            `data/data_raw/data_review/taptap_io/${app.title}/json/detail.json`,
            `data/data_clean/data_review/taptap_io/${app.title}/json/detail.json`,
          ].map(async (outputFile) => await uploadS3Json(outputFile, headers))
        );
        // await this.writeFile(outputFile, headers);

        if (!reviews) break;

        log.total_data += reviews.length;

        await Promise.all(
          reviews.map(async ({ post: postIn }) => {
            const response = await fetch(
              `${this.#BASE_URL}/webapiv2/creation/post/v1/detail?` +
                new URLSearchParams({
                  id_str: postIn.id_str,
                  "X-UA": this.#xua,
                })
            );

            const { data } = await response.json();
            const { post } = data;
            const { user, id } = post;

            const username = user.name.replaceAll("/", "").replaceAll("\n", "");
            const stat = !Object.keys(post.stat).length ? null : post.stat;

            let rating;
            try {
              rating = postIn.list_fields.app_ratings
                ? postIn.list_fields.app_ratings[app.id].score
                : null;
            } catch (e) {
              rating =
                postIn.list_fields.app_ratings[
                  Object.keys(postIn.list_fields.app_ratings)[0]
                ].score;
            }

            try {
              const data = {
                ...headers,
                path_data_raw: `S3://ai-pipeline-statistics/data/data_raw/data_review/taptap_io/${app.title}/json/data_review/${id}.json`,
                path_data_clean: `S3://ai-pipeline-statistics/data/data_clean/data_review/taptap_io/${app.title}/json/data_review/${id}.json`,
                detail_reviews: {
                  username_reviews: username,
                  gender_reviews: user.gender.length ? user.gender : null,
                  avatar_reviews: user.avatar,
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
                    .map((content) =>
                      content.children.map((e) => e.text).join("")
                    )
                    .filter((e) => e != "")
                    .join(" "),
                  reply_content_reviews: !(stat && stat.comments)
                    ? []
                    : await this.#getReplys({
                        post_id_str: postIn.id_str,
                      }),

                  date_of_experience: null,
                  date_of_experience_epoch: null,
                },
              };
              // this.writeFile(outputFile, data);
              await Promise.all(
                [
                  `data/data_raw/data_review/taptap_io/${app.title}/json/data_review/${id}.json`,
                  `data/data_raw/data_clean/taptap_io/${app.title}/json/data_review/${id}.json`,
                ].map(async (outputFile) => {
                  await uploadS3Json(outputFile, data);
                  console.log(outputFile);
                })
              );

              log.total_success += 1;
              infoLog(log, postIn.id_str, "success");
              updateLog(log);
            } catch (e) {
              log.total_failed += 1;
              infoLog(log, postIn.id_str, "error", e, "Send to S3");
            }
          })
        );
        i += 50;
      }
      console.log("success", app.title);
      log.status = "Done";
      updateLog(log);
    } catch (e) {
      console.log(e.message);
    }
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

    // }
    return await Promise.all(
      replys.map(async (reply) => {
        return {
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
        };
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
    };
  }

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

new Taptap();
