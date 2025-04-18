package com.ssginc.unnie.member.controller;

import com.ssginc.unnie.common.redis.RedisTokenService;
import com.ssginc.unnie.common.util.JwtUtil;
import com.ssginc.unnie.member.service.AuthService;
import com.ssginc.unnie.member.service.OAuthService;
import com.ssginc.unnie.member.vo.Member;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;


import java.util.HashMap;
import java.util.Map;

/**
 * OAuth 로그인 및 회원가입 관련 요청을 처리하는 컨트롤러
 */
@Slf4j
@Controller
@RequiredArgsConstructor
@RequestMapping("api/oauth")
public class OAuthController {

    private final OAuthService oAuthService;
    private final BCryptPasswordEncoder encoder;
    private final JwtUtil jwtUtil;
    private final RedisTokenService redisTokenService;
    private final AuthService authService;

    // OAuth 로그인 페이지 요청
    @GetMapping("/login")
    public String loginPage(){
        return "naverLogin";
    }

    // 이메일 중복 체크 API
    @GetMapping("/emailCheck/{email}")
    @ResponseBody
    public boolean emailCheck(@PathVariable String email, Model model, HttpServletResponse response) {
        boolean result = false;
        Member member = oAuthService.selectMemberByEmail(email);
        if(member != null) {
            result = true;
            //이미 db에 이메일 존재하면 바로 로그인 처리
            //인증 후 token 발급
            Map<String, String> mapResult = authService.oauthToken(response, member.getMemberId(), member.getMemberRole(), member.getMemberNickname());
        }
        return result;
    }

    /**
     * OAuth 첫 로그인 회원가인 페이지로 이동
     */
    // 회원가입 폼 요청
    @PostMapping("/register")
    public String register(@ModelAttribute  Member newMember, Model model) {
        log.info("Received memberPw: {}", newMember.getMemberPw());
        Member registerCheck = oAuthService.selectMemberByEmail(newMember.getMemberEmail());
        if (registerCheck == null) {
            model.addAttribute("OAuthDto", newMember);
            log.info("oauthDto: {}", newMember);
            return "member/register";  // templates/member/register.html
        } else {
            return "redirect:/";
        }
    }


    // 회원가입 폼 제출 후 최종 회원가입 완료 처리
    @ResponseBody
    @PostMapping("/register/complete")
    public  Map<String, Object> registerComplete(@RequestBody Member newMember,HttpServletResponse response) {
        Map<String, Object> result = new HashMap<>();
        Member existing = oAuthService.selectMemberByEmail(newMember.getMemberEmail());
        if (existing == null) {
            String rawPw = newMember.getMemberPw();
            // 신규 회원 등록
            Member member = Member.builder()
                    .memberEmail(newMember.getMemberEmail())
                    .memberPw(encoder.encode(rawPw))
                    .memberName(newMember.getMemberName())
                    .memberNickname(newMember.getMemberNickname())
                    .memberPhone(newMember.getMemberPhone())
                    .memberProvider(newMember.getMemberProvider())
                    .build();

            //회원 등록
            oAuthService.insertOAuthMember(member);

            // DB에 등록된 회원 정보를 다시 조회하여 memberId 가져옴
            Member insertedMember = oAuthService.selectMemberByEmail(member.getMemberEmail());

            //토큰 생성, 저장
            authService.oauthToken(response, insertedMember.getMemberId(), insertedMember.getMemberRole(), insertedMember.getMemberNickname());

            // 최종 회원가입 완료 후 홈으로 리다이렉트 (이미 로그인된 상태)
            result.put("redirect", "/");
        } else {
            result.put("redirect", "/");
        }
        return result;
    }
}