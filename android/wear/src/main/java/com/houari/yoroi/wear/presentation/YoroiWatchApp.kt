package com.houari.yoroi.wear.presentation

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material3.HorizontalPageIndicator
import androidx.wear.compose.material3.rememberPageIndicatorState
import com.houari.yoroi.wear.data.YoroiDataRepository
import com.houari.yoroi.wear.theme.WatchBg

/**
 * App principale WearOS - 5 pages swipables (identique Apple Watch)
 * Page 1: Dashboard (Timer, Pas, Carnet, Sante)
 * Page 2: Poids
 * Page 3: Hydratation
 * Page 4: Sommeil
 * Page 5: Reglages
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun YoroiWatchApp(repository: YoroiDataRepository) {
    val pageCount = 6
    val pagerState = rememberPagerState(pageCount = { pageCount })

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(WatchBg)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { page ->
            when (page) {
                0 -> DashboardPage(repository)
                1 -> CarnetPage(repository)
                2 -> WeightPage(repository)
                3 -> HydrationPage(repository)
                4 -> SleepPage(repository)
                5 -> SettingsPage(repository)
            }
        }

        // Page indicator en bas
        HorizontalPageIndicator(
            pageIndicatorState = rememberPageIndicatorState(
                pageCount = pageCount,
                currentPage = { pagerState.currentPage }
            ),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 4.dp)
        )
    }
}
