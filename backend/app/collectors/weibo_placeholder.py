from datetime import datetime

from .base import CollectionCandidate


class WeiboVerifiedInterfaceCollector:
    collector_type = "weibo_verified_interface"

    def collect(
        self,
        account_id: int,
        group_id: int,
        range_start: datetime,
        range_end: datetime,
    ) -> list[CollectionCandidate]:
        raise NotImplementedError(
            "Real Weibo collection requires a verified, authorized interface mapping. "
            "Record redacted verification reports before implementing this collector."
        )
