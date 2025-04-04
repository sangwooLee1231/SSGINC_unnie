package com.ssginc.unnie.community.controller;

import com.github.pagehelper.PageInfo;
import com.ssginc.unnie.community.dto.board.BoardCategory;
import com.ssginc.unnie.community.dto.board.BoardsGuestGetResponse;
import com.ssginc.unnie.community.dto.board.SearchType;
import com.ssginc.unnie.community.dto.board.SortType;
import com.ssginc.unnie.community.service.BoardService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Slf4j
@Controller
@RequiredArgsConstructor
@RequestMapping("community/board")
public class BoardViewController {

    private final BoardService boardService;

    @GetMapping("/guest")
    public String getGuestBoardListView(HttpSession session, Model model) {
        PageInfo<BoardsGuestGetResponse> boards = boardService.getBoardsGuest(BoardCategory.NOTICE, "LATEST", "TITLE", "", 1);

        model.addAttribute("boards", boards);
        model.addAttribute("boardCategory", BoardCategory.values());
        model.addAttribute("sortType", SortType.values());
        model.addAttribute("searchType", SearchType.values());

        return "community/boardList";
    }

}
