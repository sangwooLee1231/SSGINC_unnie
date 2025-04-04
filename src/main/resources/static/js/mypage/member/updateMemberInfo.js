let isValid = {
    nickname: false,
    phone: false

}
// ------------------------------------
// 정규식 (유효성 검증)
// ------------------------------------
const nicknameRegex = /^[가-힣a-zA-Z0-9]{2,20}$/;
const phoneRegex = /^01[0-9]\d{7,8}$/;
const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;

// 메시지 표시: success이면 초록색, 아니면 빨간색으로 표시
function showMsg(element, type, message) {
    element.html(`<p>${message}</p>`).css('color', type === "success" ? 'green' : 'red');
}


// ------------------------------------
// 인증 타이머 클래스 (AuthTimer)
// ------------------------------------
// 인증번호 전송 후 남은 유효시간(3분) 표시,
// 시간이 초과되면 지정된 콜백 호출
class AuthTimer {
    constructor(duration, $timerElement, onExpire) {
        this.duration = duration;
        this.$timerElement = $timerElement;
        this.timerId = null;
        this.onExpire = onExpire;
    }

    //타이머 시작
    start() {
        let timeLeft = this.duration;
        //남은 시간 포맷해서 timerElement에 표시
        this.$timerElement.text(this.formatTime(timeLeft));
        this.$timerElement.show(); // 타이머 영역

        //1초마다 실행되는 타이머
        this.timerId = setInterval(() => {
            timeLeft--;
            // 시간이 다 떨어지면 타이머 정지 후 onExpire
            if (timeLeft <= 0) {
                clearInterval(this.timerId);
                this.onExpire();
            } else {
                this.$timerElement.text(this.formatTime(timeLeft));
            }
        }, 1000);
    }

    //타이머 정지
    stop() {
        clearInterval(this.timerId);
    }

    hide() {
        this.$timerElement.hide();
    }

    //초 단위 시간을 분:초 형식으로 변환
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
}

// ================================= 닉네임 ======================================
// ------------------------------------
// 닉네임 수정
// ------------------------------------
async function updateNickname() {
    const $nickname = $("#memberNickname");
    const $nicknameError = $("#nicknameError");
    const nicknameVal = $nickname.val().trim();

    if (!nicknameVal) {
        showMsg($nicknameError, "error", "닉네임을 입력해주세요.");
        return;
    }
    //유효성 검사
    if (!nicknameRegex.test(nicknameVal)) {
        showMsg($nicknameError, "error", "2~20글자로 입력해주세요.");
        return;
    }

    //닉네임 중복 확인
    try{
        const response = await axios.get("/api/member/nicknameCheck", {
            params: { nickname: nicknameVal }
        });
        if (!response.data) {
            showMsg($nicknameError, "error", "이미 사용 중인 닉네임입니다.");
            return;
        }
    } catch (error) {
        console.error(error);
        showMsg($nicknameError, "error", "닉네임 중복 확인 중 오류가 발생했습니다.");
        return;
    }

    //중복 아니면 닉네임 수정 완료
    try {
        // 닉네임 수정 요청
        const response = await axios.put("/api/mypage/member/nickname", {
            memberNickname: nicknameVal
        },  { withCredentials: true });  // 쿠키 자동 처리
        if (response.status === 200) {
            // showMsg($nicknameError, "success", "닉네임이 수정되었습니다.");
            alert("닉네임이 수정되었습니다.");
            //$(".memberNickname").text(nicknameVal);
            // 수정한 닉네임을 입력칸에 남김
            $nickname.val(nicknameVal);
            // 에러 메시지 제거
            $nicknameError.html("");
        }
    } catch (error) {
        console.error(error);
        // 에러 메시지 처리
        if (error.response && error.response.data && error.response.data.message) {
            showMsg($nicknameError, "error", error.response.data.message);
        } else {
            showMsg($nicknameError, "error", "닉네임 수정 중 오류가 발생했습니다.");
        }
    }
}


// ================================= 전화번호 ======================================
// ------------------------------------
// 전화번호 인증 + 수정
// ------------------------------------
class PhoneAuthentication {
    constructor() {
        this.isSending = false;
        this.isVerified = false; // 인증 성공 여부

        this.authManager = new AuthTimer(
            180,
            $("#phone-auth-timer"),
            this.onTimerExpire.bind(this)
        );

        this.$phoneInput = $("#memberPhone");
        this.$phoneError = $("#phoneError");
        this.$authInput = $("#phoneAuthCode");
        this.$phoneAuthSection = $("#phoneAuthSection");

        this.$sendButton = $("#sendPhoneVerification");
        this.$verifyButton = $("#verifyPhoneCode");
        this.$phoneAuthGroup = $("#phoneAuthGroup");

        // 전화번호 수정 버튼
        // this.$updatePhoneBtn = $("#updatePhoneBtn");

        this.initializeEvents();
    }

    initializeEvents() {
        this.$sendButton.on("click", () => this.sendAuthNum());
        this.$verifyButton.on("click", () => this.verifyAuthNum());
        // this.$updatePhoneBtn.on("click", () => this.updatePhone());
    }

    // 인증번호 전송
    async sendAuthNum() {
        if (this.isSending) {
            showMsg(this.$phoneError, "error", "이미 전송되었습니다.");
            return;
        }
        const phone = this.$phoneInput.val().trim();

        if (!phone) {
            showMsg(this.$phoneError, "error", "전화번호를 입력해주세요.");
            return;
        }
        if (!phoneRegex.test(phone)) {
            showMsg(this.$phoneError, "error", "전화번호 형식이 올바르지 않습니다.");
            return;
        }

        this.isSending = true;
        try {
            // 서버에 인증번호 전송 API
            const response = await axios.post("/api/member/sendPhone", { memberPhone: phone });
            if (response.status === 200) {
                showMsg(this.$phoneError, "success", "인증번호가 전송되었습니다.");
            }

            // 인증번호 입력칸/영역 보이기
            this.$phoneAuthGroup.show();
            this.$authInput.prop("readonly", false).val("").focus();
            // 타이머 시작
            this.authManager.start();

        } catch (error) {
            console.error(error);
            showMsg(this.$phoneError, "error", "인증번호 전송 중 오류가 발생했습니다.");
            this.isSending = false;
        }
    }

    //인증번호 확인
    async verifyAuthNum() {
        const authCode = this.$authInput.val().trim();
        if (!authCode) {
            showMsg(this.$phoneAuthSection, "error", "인증번호를 입력해주세요.");
            return;
        }

        try {
            // 인증번호 검증
            const response = await axios.post("/api/member/checkPhone", {
                memberPhone: this.$phoneInput.val(),
                code: authCode
            });
            if (response.status === 200) {
                showMsg(this.$phoneAuthSection, "success", "인증이 완료되었습니다.");
                // 타이머 중지/숨김
                this.authManager.stop();
                this.authManager.hide();

                await this.updatePhone();

                // 인증 완료 후
                this.$phoneInput.prop("readonly", true);
                this.$authInput.prop("readonly", true);
                this.$sendButton.prop("disabled", true);
                this.$verifyButton.prop("disabled", true);

                this.isVerified = true; // 인증 성공
            }
        } catch (error) {
            console.error(error);
            showMsg(this.$phoneAuthSection, "error", "인증번호가 올바르지 않습니다.");
        }
    }

    // 전화번호 수정
    async updatePhone() {

        // 인증된 전화번호를 업데이트
        const phone = this.$phoneInput.val().trim();
        if (!phone) {
            showMsg(this.$phoneError, "error", "전화번호를 입력해주세요.");
            return;
        }

        try {
            const response = await axios.put("/api/mypage/member/phone", {
                memberPhone: phone
            });
            if (response.status === 200) {
                //showMsg(this.$phoneAuthSection, "success", "전화번호가 수정되었습니다.");
                alert("전화번호가 수정되었습니다.");
                $("#current-phone").val(phone);
                // 모달 닫기
                closePhoneModal();
            }
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.message) {
                showMsg(this.$phoneError, "error", error.response.data.message);
            } else {
                showMsg(this.$phoneAuthSection, "error", "전화번호 수정 중 오류가 발생했습니다.");
            }
        }
    }

    // 인증시간 만료
    onTimerExpire() {
        showMsg(this.$phoneAuthSection, "error", "인증 시간이 만료되었습니다.");
        this.authManager.hide();
    }
}
// ================================= 비밀번호 ======================================
//  새 비밀번호 유효성검사
function checkNewPassword() {
    const $newPw = $("#newPw");
    const $newPwError = $("#newPwError");
    const newVal = $newPw.val().trim();

    if (newVal && !pwRegex.test(newVal)) {
        showMsg($newPwError, "error", "영문, 숫자, 특수문자(!@#$%^&*) 포함 8~20자 이내로 설정하세요.");
    } else {
        showMsg($newPwError, "success", "");
    }
}

// 새 비밀번호와 확인 비밀번호 일치 여부 체크
function checkConfirmPassword() {
    const newVal = $("#newPw").val().trim();
    const confirmVal = $("#newPwConfirm").val().trim();
    const $newPwConfirmError = $("#newPwConfirmError");

    if (!confirmVal) {
        showMsg($newPwConfirmError, "error", "비밀번호를 입력해주세요.");
        return;
    }
    if (newVal !== confirmVal) {
        showMsg($newPwConfirmError, "error", "비밀번호가 일치하지 않습니다.");
    } else {
        showMsg($newPwConfirmError, "success", "");
    }
}

// ------------------------------------
// 비밀번호 변경
// ------------------------------------
async function updatePassword() {
    const $currentPw = $("#currentPw");
    const $newPw = $("#newPw");
    const $newPwConfirm = $("#newPwConfirm");

    const $currentPwError = $("#currentPwError");
    const $newPwError = $("#newPwError");
    const $newPwConfirmError = $("#newPwConfirmError");

    // 초기화
    showMsg($currentPwError, "success", "");
    showMsg($newPwError, "success", "");
    showMsg($newPwConfirmError, "success", "");

    const currentVal = $currentPw.val().trim();
    const newVal = $newPw.val().trim();
    const confirmVal = $newPwConfirm.val().trim();

    if (!currentVal) {
        showMsg($currentPwError, "error", "비밀번호를 입력해주세요.");
        return;
    }
    if (!newVal) {
        showMsg($newPwError, "error", "새 비밀번호를 입력해주세요.");
        return;
    }
    if (!pwRegex.test(newVal)) {
        showMsg($newPwError, "error", "영문, 숫자, 특수문자(!@#$%^&*) 포함 8~20자 이내로 설정하세요.");
        return;
    }
    if (newVal !== confirmVal) {
        showMsg($newPwConfirmError, "error", "비밀번호가 일치하지 않습니다.");
        return;
    }

    try {
        // 비밀번호 변경 요청
        const response = await axios.put("/api/mypage/member/password", {
            currentPw: currentVal,
            newPw: newVal,
            newPwConfirm: confirmVal
        });
        if (response.status === 200) {
            //showMsg(this.$currentPwError, "success", "비밀번호가 수정되었습니다.");
            alert("비밀번호가 변경되었습니다.");
            $currentPw.val("");
            $newPw.val("");
            $newPwConfirm.val("");
        }
    } catch (error) {
        console.error(error);
        if (error.response && error.response.data && error.response.data.message) {
            showMsg($currentPwError, "error", error.response.data.message);
        } else {
            alert("비밀번호 변경 중 오류가 발생했습니다.");
        }
    }
}


$(document).ready(function() {
    // 전화번호 인증 + 수정
    const phoneAuth = new PhoneAuthentication();

    // 닉네임 수정
    $("#updateNicknameBtn").on("click", updateNickname);

    // 현재 비밀번호 입력 시, 기존 오류 메시지 제거
    $("#currentPw").on("keyup", function() {
        $("#currentPwError").html("");
    });

    // 비밀번호 변경
    $("#updatePwBtn").on("click", updatePassword);

    // 새 비밀번호와 확인 비밀번호 필드 실시간 체크
    $("#newPw").on("keyup", checkNewPassword);
    $("#newPwConfirm").on("keyup", checkConfirmPassword);
})

// ================================= 프로필 기본 이미지 적용 ======================================
document.addEventListener("DOMContentLoaded", function () {
    const profileImg = document.getElementById("profilePreview");
    const profileMenu = document.getElementById("profileMenu");
    const fileInput = document.getElementById("profileImage");
    // 프로필 메뉴 토글 함수
    function toggleProfileMenu(event) {
        event.stopPropagation();
        profileMenu.style.display = profileMenu.style.display === "block" ? "none" : "block";
    }

    // 프로필 사진 클릭 시 드롭다운 표시
    profileImg.addEventListener("click", toggleProfileMenu);

    // 프로필 변경 클릭 시 파일 선택 창 열기
    document.getElementById("changeProfile").addEventListener("click", function () {
        fileInput.click();
    });

    // 바깥 클릭 시 드롭다운 닫기
    document.addEventListener("click", function (event) {
        if (!profileImg.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.style.display = "none";
        }
    });

    // 기본 이미지 적용
    document.getElementById("defaultProfile").addEventListener("click", function () {
        const defaultImgPath = "https://unnie-bucket2.s3.ap-northeast-2.amazonaws.com/profile.png";
        const profileImg = document.getElementById("profilePreview");
        profileImg.src = defaultImgPath;

        const memberId = document.getElementById("memberId").value;
        axios.put("/api/mypage/member/defaultProfile", {
            memberId: memberId,
            memberProfile: defaultImgPath
        })
            .then(response => {
                alert("기본 이미지로 변경되었습니다.");
                location.reload();
            })
            .catch(error => {
                console.error(error);
                alert("기본 이미지 적용 중 오류가 발생했습니다.");
            });
    });

    // 기존 프로필 이미지 업데이트 유지
    updateProfileImage();
});

// ================================= 프로필 이미지 파일 선택 및 업데이트 ======================================
function updateProfileImage() {
    const fileInput = document.getElementById("profileImage");
    const previewImg = document.getElementById("profilePreview");
    const memberId = document.getElementById("memberId").value;

    // 파일 선택 이벤트가 발생했을 때 처리
    fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];
        if (!file) return;

        // FileReader를 이용해 미리보기 이미지 업데이트
        const reader = new FileReader();
        reader.onload = function (e) {
            previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // FormData
        const formData = new FormData();

        // JSON 객체 생성 후 Blob으로 변환하여 추가
        const profileRequest = {
            memberId: memberId,
            memberProfile: ""
        };
        formData.append("profileImgUpdateRequest", new Blob([JSON.stringify(profileRequest)], {
            type: "application/json"
        }));
        // 파일 추가
        formData.append("memberProfileFile", file);

        // 프로필 이미지 업데이트
        axios.put("/api/mypage/member/profileImg", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        })
            .then(response => {
                alert("프로필 이미지가 변경되었습니다.");
                location.reload();
            })
            .catch(error => {
                console.error(error);
                alert("프로필 이미지 변경 중 오류가 발생했습니다.");
            });
    });
}

// 휴대전화번호 변경 모달 열기
function openPhoneModal() {
    document.getElementById("phoneModal").style.display = "flex";
}

// 휴대전화번호 변경 모달 닫기
function closePhoneModal() {
    document.getElementById("phoneModal").style.display = "none";
}

//이벤트 등록
document.addEventListener("DOMContentLoaded", function () {
    updateProfileImage();
});


// ================================= 회원탈퇴 바텀시트 + 모달  ======================================
// 모달 열기
window.openWithdrawSheet = function() {
    document.getElementById("withdrawModal").style.display = "flex";
};

// 모달 닫기
function closeWithdrawModal() {
    document.getElementById("withdrawModal").style.display = "none";
    // 입력값 초기화 및 에러 메시지 제거
    document.getElementById("withdrawCurrentPw").value = "";
    document.getElementById("withdrawCurrentPwError").innerText = "";
    document.getElementById("withdrawCheck").checked = false;
    document.getElementById("withdrawConfirmBtn").disabled = true;
}

// 체크박스(동의) 시 탈퇴버튼 활성화
const withdrawCheck = document.getElementById("withdrawCheck");
const withdrawConfirmBtn = document.getElementById("withdrawConfirmBtn");
if (withdrawCheck && withdrawConfirmBtn) {
    withdrawCheck.addEventListener("change", function () {
        withdrawConfirmBtn.disabled = !this.checked;
    });
}

// 모달 내 탈퇴 버튼 클릭 후 최종확인 모달
if (withdrawConfirmBtn) {
    withdrawConfirmBtn.addEventListener("click", function () {
        const pwVal = document.getElementById("withdrawCurrentPw").value.trim();
        const pwError = document.getElementById("withdrawCurrentPwError");

        // 비밀번호 입력 검증
        if (!pwVal) {
            pwError.innerText = "비밀번호를 입력해주세요.";
            return;
        } else {
            pwError.innerText = "";
        }

        // 바텀시트 닫고 최종확인 모달 열기
        openConfirmWithdrawModal();
    });
}

// 최종확인 모달 열기/닫기
function openConfirmWithdrawModal() {
    document.getElementById("confirmWithdrawModal").style.display = "flex";
}
function closeConfirmWithdrawModal() {
    document.getElementById("confirmWithdrawModal").style.display = "none";
}

// 탈퇴 진행
// PATCH 요청
const finalYesBtn = document.getElementById("finalWithdrawYesBtn");
if (finalYesBtn) {
    finalYesBtn.addEventListener("click", async function () {
        const pwVal = document.getElementById("withdrawCurrentPw").value.trim();
        try {
            // 탈퇴 API 호출
            const response = await axios.patch("/api/mypage/member/withdraw", {
                currentPw: pwVal
            });
            if (response.status === 200) {
                console.log("탈퇴 응답:", response);
                // 탈퇴 성공 시
                closeConfirmWithdrawModal();
                openWithdrawSuccessModal();
            }
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.message) {
                // INVALID_PASSWORD 에러 메시지
                alert(error.response.data.message);
            } else {
                alert("탈퇴 처리 중 오류가 발생했습니다.");
            }
        }
    });
}

// 정말 탈퇴 취소 버튼
const finalNoBtn = document.getElementById("finalWithdrawNoBtn");
if (finalNoBtn) {
    finalNoBtn.addEventListener("click", function () {
        closeConfirmWithdrawModal();
    });
}

// 탈퇴 완료 모달 열기/닫기
function openWithdrawSuccessModal() {
    document.getElementById("withdrawSuccessModal").style.display = "flex";
}
function closeWithdrawSuccessModal() {
    document.getElementById("withdrawSuccessModal").style.display = "none";
    //  memberId 추출
    const memberId = document.getElementById("memberId").value;

    // 로그아웃 요청 (토큰 삭제)
    axios.post("/member/logout", {
        memberId: memberId
    })
        .then(response => {
            // 로그아웃 성공 시 메인 페이지로 이동
            window.location.href = "/";
        })
        .catch(error => {
            console.error("로그아웃 중 오류 발생:", error);
            alert("로그아웃 처리 중 오류가 발생했습니다.");
            window.location.href = "/";
        });
}

// 탈퇴 완료 모달의 확인 버튼
const successOkBtn = document.getElementById("withdrawSuccessOkBtn");
if (successOkBtn) {
    successOkBtn.addEventListener("click", function () {
        closeWithdrawSuccessModal();
    });
}


