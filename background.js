import "./ss-background.js";
import { createContextMenu, MENU_ID } from "./contextMenu.js";
import { getCurrentPageSource, getSelectedText } from "./helper.js";

// https://new-app.datatera.io
// http://localhost:5000
let baseUrl = "";
// Assuming your JSON file is in the 'data' folder and named 'data.json'
const jsonFilePath = chrome.runtime.getURL("data/config.json");

function setDefaultStorage() {
  fetch(jsonFilePath)
    .then((response) => response.json())
    .then((data) => {
      baseUrl = data.url;
      console.log(baseUrl);
      chrome.storage.local.set(
        {
          baseUrl: baseUrl,
          token: "",
          userLoggedIn: false,
          conversionList: [],
          uploadParams: {
            processURLs: false,
            smartMerge: false,
            returnRowsLimit: 0,
            model: 1,
          },
        },
        () => {
          console.log("Data saved to storage");
        }
      );
    })
    .catch((error) => {
      console.error("Error loading JSON:", error);
    });
}

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    createContextMenu();
    chrome.storage.local.clear(setDefaultStorage);
  } else if (details.reason == "update") {
    var thisVersion = chrome.runtime.getManifest().version;
    console.log(
      "Updated from " + details.previousVersion + " to " + thisVersion + "!"
    );
  }
});

// chrome.storage.sync.clear()
chrome.storage.sync.get((config) => {
  if (!config.method) {
    chrome.storage.sync.set({
      method: "crop",
    });
  }
  if (!config.format) {
    chrome.storage.sync.set({
      format: "png",
    });
  }
  if (!config.save) {
    chrome.storage.sync.set({
      save: "file",
    });
  }
  if (config.dpr === undefined) {
    chrome.storage.sync.set({
      dpr: true,
    });
  }
  // v1.9 -> v2.0
  if (config.save === "clipboard") {
    config.save = "url";
    chrome.storage.sync.set({
      save: "url",
    });
  }
  // v2.0 -> v3.0
  if (config.icon === undefined) {
    config.icon = false;
    chrome.storage.sync.set({
      icon: false,
    });
  }
  // chrome.action.setIcon({
  //     path: [16, 19, 38, 48, 128].reduce((all, size) => (
  //         color = config.icon ? 'light' : 'dark',
  //         all[size] = `/assets/icons/${color}/${size}x${size}.png`,
  //         all
  //     ), {})
  // })
});
/* function inject(tab) {
  console.log("inside inject");
  chrome.tabs.sendMessage(
    tab.id,
    {
      message: "init",
    },
    (res) => {
      if (res) {
        clearTimeout(timeout);
      }
    }
  );

  var timeout = setTimeout(() => {
    chrome.scripting.insertCSS({
      files: ["assets/vendor/jquery.Jcrop.min.css"],
      target: {
        tabId: tab.id,
      },
    });
    chrome.scripting.insertCSS({
      files: ["assets/content/index.css"],
      target: {
        tabId: tab.id,
      },
    });
    chrome.scripting.executeScript({
      files: ["assets/vendor/jquery.min.js"],
      target: {
        tabId: tab.id,
      },
    });
    chrome.scripting.executeScript({
      files: ["assets/vendor/jquery.Jcrop.min.js"],
      target: {
        tabId: tab.id,
      },
    });
    chrome.scripting.executeScript({
      files: ["assets/vendor/notify.min.js"],
      target: {
        tabId: tab.id,
      },
    });
    chrome.scripting.executeScript({
      files: ["assets/content/crop.js"],
      target: {
        tabId: tab.id,
      },
    });
    chrome.scripting.executeScript({
      files: ["assets/content/index.js"],
      target: {
        tabId: tab.id,
      },
    });
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        message: "init",
      });
    }, 100);
  }, 100);
} */
// chrome.action.onClicked.addListener((tab) => {
//     inject(tab)
// })
// chrome.commands.onCommand.addListener((command) => {
//     if (command === 'take-screenshot') {
//         chrome.tabs.query({
//             active: true,
//             currentWindow: true
//         }, (tab) => {
//             inject(tab[0])
//         })
//     }
// })
chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === "capture") {
    chrome.storage.sync.get((config) => {
      chrome.tabs.query(
        {
          active: true,
        },
        (tab) => {
          chrome.tabs.captureVisibleTab(
            tab.windowId,
            {
              format: config.format,
            },
            (image) => {
              // image is base64
              console.log("1");
              if (config.method === "view") {
                if (req.dpr !== 1 && !config.dpr) {
                  console.log("2");

                  res({
                    message: "image",
                    args: [image, req.area, req.dpr, config.dpr, config.format],
                  });
                } else {
                  console.log("3");

                  res({
                    message: "image",
                    image,
                  });
                }
              } else {
                console.log("4");

                res({
                  message: "image",
                  args: [image, req.area, req.dpr, config.dpr, config.format],
                });
              }
            }
          );
        }
      );
    });
  } else if (req.message === "active") {
    if (req.active) {
      chrome.storage.sync.get((config) => {
        if (config.method === "view") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Capture Viewport",
          });
          chrome.action.setBadgeText({
            tabId: sender.tab.id,
            text: "⬒",
          });
        }
        // else if (config.method === 'full') {
        //   chrome.action.setTitle({tabId: sender.tab.id, title: 'Capture Document'})
        //   chrome.action.setBadgeText({tabId: sender.tab.id, text: '⬛'})
        // }
        else if (config.method === "crop") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Crop and Save",
          });
          chrome.action.setBadgeText({
            tabId: sender.tab.id,
            text: "◩",
          });
        } else if (config.method === "wait") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Crop and Wait",
          });
          chrome.action.setBadgeText({
            tabId: sender.tab.id,
            text: "◪",
          });
        }
      });
    } else {
      chrome.action.setTitle({
        tabId: sender.tab.id,
        title: "Screenshot Capture",
      });
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: "",
      });
    }
  } else if (req.message == "inject") {
    console.log("Inject Message");
    let tab = JSON.parse(req.tabData);
    chrome.tabs.sendMessage(tab.id, { message: "init" });
    // Get the popup window.
    // const popup = chrome.windows.get({
    //   url: "/pages/conversion-actions.html",
    // });

    // // Close the popup window.
    // popup.close();
    /* setTimeout(() => {
      inject(tab);
    }, 1000); */
  } else if (req.message == "full_page_screenshot") {
    setTimeout(() => {
      chrome.windows.getCurrent((currentWindow) => {
        chrome.tabs.captureVisibleTab(currentWindow.id, (dataUrl) => {
          // Do something with the dataUrl.
          console.log(dataUrl);
        });
      });
    }, 3000);
  } else if (req.message === "uploadFileToDB") {
    fetch(req.fileURL)
      .then((response) => response.blob())
      .then((file) => {
        // Now you have the file object, and you can use it as needed
        // console.log("Received file in background script:", file);
        let formData = new FormData();

        formData.append("id", req?.conversionId);
        formData.append("sourceUrl", req?.sourceUrl);
        formData.append("processUrls", `${req?.textCheckBox ? true : false}`);
        formData.append(
          "returnRowsLimit",
          `${req?.returnRowsLimitValue ? req?.returnRowsLimitValue : null}`
        );
        formData.append("merge", `${req?.mergeCheckBox ? true : false}`);
        formData.append("model", `${req?.model ? req?.model : null}`);
        formData.append("isBackground", true);

        formData.append("file", file);

        chrome.storage.local.get(["token", "userData", "baseUrl"], (d) => {
          if (
            d.token == null ||
            d.token == undefined ||
            d.token == "" ||
            d.userData == null ||
            d.userData == undefined
          ) {
            console.log("Token Not FOUND");
          } else {
            //"http://new-app.datatera.io/v1/conversion/uploadFileToDb"
            //"http://localhost:5000/api/v1/conversion/uploadFileToDb"

            let baseUrl = d.baseUrl;
            fetch(`${baseUrl}/v1/conversion/uploadFileToDb`, {
              method: "POST",
              headers: {
                Authorization: "Bearer " + d.token,
              },
              body: formData,
            }).then((response) => {
              return response.json().then((resp) => {
                res({
                  message: "success",
                  args: resp,
                  status: response.status,
                });
              });
            });
            // .then((resp) => {

            // });
            // .catch((e) => {
            //   res({
            //     message: "error",
            //     args: e,
            //   });
            // });
          }
        });
        URL.revokeObjectURL(req.fileURL);
      })
      .catch((error) => {
        // res({
        //   message: "error",
        //   args: error,
        // });
      });
  } else if (req.message === "delete") {
    console.log(req?.conversionId);

    chrome.storage.local.get(["token", "userData"], (d) => {
      if (
        d.token == null ||
        d.token == undefined ||
        d.token == "" ||
        d.userData == null ||
        d.userData == undefined
      ) {
        console.log("Token Not FOUND");
      } else {
        fetch(`${baseUrl}/v1/conversion/delData/${req?.conversionId}`, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + d.token,
          },
        })
          .then((res) => res.json())
          .then((resp) => {
            res({
              message: "success",
              args: resp,
            });
          });
      }
    });
  } else if (req.message === "getData") {
    chrome.storage.local.get(["token", "userData", "baseUrl"], (d) => {
      let baseUrl = d.baseUrl;
      if (
        d.token == null ||
        d.token == undefined ||
        d.token == "" ||
        d.userData == null ||
        d.userData == undefined
      ) {
        console.log("Token Not FOUND");
      } else {
        fetch(`${baseUrl}/v1/conversion/getData/${req?.conversionId}`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + d.token,
          },
        })
          .then((res) => res.json())
          .then((resp) => {
            res({
              message: "success",
              args: resp,
            });
          });
      }
    });
  }
  return true;
});

// Image Upload
chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message == "image-upload") {
    imageUpload(req.image, req.fileName);
  }
});

async function imageUpload(image, fileName) {
  var [header, base64] = image.split(",");
  var [_, type] = /data:(.*);base64/.exec(header);
  var binary = atob(base64);
  var array = new Uint8Array(
    Array.from({ length: binary.length }, (_, index) =>
      binary.charCodeAt(index)
    )
  );

  const file = new File([array], fileName, { type });
  const [tab] = await chrome.tabs.query({ active: true });
  let sourceUrl = tab.url;

  chrome.storage.local.get(
    ["token", "userData", "baseUrl", "conversionId", "uploadParams"],
    (d) => {
      let baseUrl = d.baseUrl;
      let formData = new FormData();
      formData.append("sourceUrl", sourceUrl);
      formData.append("id", d.conversionId);
      formData.append("isBackground", true);
      //formData.append("model", 1);
      //formData.append("processUrls", false);

      for (const k in d.uploadParams) {
        formData.append(k, d.uploadParams[k]);
      }

      formData.append("file", file);

      if (
        d.token == null ||
        d.token == undefined ||
        d.token == "" ||
        d.userData == null ||
        d.userData == undefined ||
        d.conversionId == null ||
        d.conversionId == undefined
      ) {
        console.log("Image Upload: Missing Form Data");
      } else {
        //console.log("Form data (screenshot): "+formData);
        fetch(`${baseUrl}/v1/conversion/uploadFileToDb`, {
          method: "POST",
          headers: {
            Authorization: "Bear " + d.token,
          },
          body: formData,
          credentials: "include",
        })
          .then((res) => res.json())
          .then((resp) => console.log(resp));
      }
    }
  );
}

chrome.contextMenus.onClicked.addListener(({ menuItemId }) => {
  const [type, conversionId, mergeType] = menuItemId.split("-");
  const merge = mergeType == "card" ? true : false;

  if (type == "page" && mergeType) {
    UploadPage_ContextMenu(conversionId, merge);
  }
  if (type == "selection" && mergeType) {
    UploadSelectedText_ContextMenu(conversionId, merge);
  }
});

async function UploadPage_ContextMenu(conversionId, merge) {
  const [tab] = await chrome.tabs.query({ active: true });
  let sourceUrl = tab.url;
  chrome.tabs.sendMessage(tab.id, {
    action: "notify",
    text: "Web page uploaded Successfully",
  });
  const pageSource = await getCurrentPageSource();
  const blob = new Blob([pageSource], { type: "text/html" });

  chrome.storage.local.get(["token", "userData", "baseUrl"], (d) => {
    let baseUrl = d.baseUrl;
    let formData = new FormData();
    formData.append("sourceUrl", sourceUrl);
    formData.append("id", conversionId);
    formData.append("merge", merge);
    formData.append("model", 1);
    formData.append("processUrls", false);
    formData.append("isBackground", true);

    formData.append("file", blob);

    if (
      d.token == null ||
      d.token == undefined ||
      d.token == "" ||
      d.userData == null ||
      d.userData == undefined
    ) {
      console.log("Page Upload: Missing Form Data");
    } else {
      fetch(`${baseUrl}/v1/conversion/uploadFileToDb`, {
        method: "POST",
        headers: {
          Authorization: "Bear " + d.token,
        },
        body: formData,
        credentials: "include",
      })
        .then((res) => res.json())
        .then((resp) => console.log(resp));
    }
  });
}

async function UploadSelectedText_ContextMenu(conversionId, merge) {
  const [tab] = await chrome.tabs.query({ active: true });
  let sourceUrl = tab.url;

  chrome.tabs.sendMessage(tab.id, {
    action: "notify",
    text: "Selected text uploaded Successfully",
  });

  const selectedText = await getSelectedText();
  const blob = new Blob([selectedText], { type: "text/plain" });

  chrome.storage.local.get(["token", "userData", "baseUrl"], (d) => {
    let baseUrl = d.baseUrl;
    let formData = new FormData();
    formData.append("sourceUrl", sourceUrl);
    formData.append("id", conversionId);
    formData.append("merge", merge);
    formData.append("isBackground", true);
    formData.append("model", 1);
    formData.append("processUrls", false);

    formData.append("file", blob);

    if (
      d.token == null ||
      d.token == undefined ||
      d.token == "" ||
      d.userData == null ||
      d.userData == undefined
    ) {
      console.log("Selected Text Upload: Missing Form Data");
    } else {
      fetch(`${baseUrl}/v1/conversion/uploadFileToDb`, {
        method: "POST",
        headers: {
          Authorization: "Bear " + d.token,
        },
        body: formData,
        credentials: "include",
      })
        .then((res) => res.json())
        .then((resp) => console.log(resp));
    }
  });
}
