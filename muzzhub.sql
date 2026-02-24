-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 19, 2026 at 02:21 AM
-- Server version: 10.6.25-MariaDB-log
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `n111145_development_cms`
--

-- --------------------------------------------------------

--
-- Table structure for table `muzzhub`
--

CREATE TABLE `muzzhub` (
  `id` int(10) UNSIGNED NOT NULL,
  `yelp_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `createdByUserNum` int(10) UNSIGNED NOT NULL,
  `updated_at` datetime NOT NULL,
  `updatedByUserNum` int(10) UNSIGNED NOT NULL,
  `name` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `address` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `city` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `state` mediumtext DEFAULT NULL,
  `zip` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `longitude` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `latitude` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `description` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `type` mediumtext DEFAULT NULL,
  `phone` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `email` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `monday_open` mediumtext DEFAULT NULL,
  `monday_close` mediumtext DEFAULT NULL,
  `tuesday_open` mediumtext DEFAULT NULL,
  `tuesday_close` mediumtext DEFAULT NULL,
  `wednesday_open` mediumtext DEFAULT NULL,
  `wednesday_close` mediumtext DEFAULT NULL,
  `thursday_open` mediumtext DEFAULT NULL,
  `thursday_close` mediumtext DEFAULT NULL,
  `friday_open` mediumtext DEFAULT NULL,
  `friday_close` mediumtext DEFAULT NULL,
  `saturday_open` mediumtext DEFAULT NULL,
  `saturday_close` mediumtext DEFAULT NULL,
  `sunday_open` mediumtext DEFAULT NULL,
  `sunday_close` mediumtext DEFAULT NULL,
  `cuisine` mediumtext DEFAULT NULL,
  `compliance` mediumtext DEFAULT NULL,
  `alcohol` tinyint(1) UNSIGNED NOT NULL,
  `halal_items` mediumtext DEFAULT NULL,
  `kids_menu` tinyint(1) UNSIGNED NOT NULL,
  `pray_space` tinyint(1) UNSIGNED NOT NULL,
  `organic` tinyint(1) UNSIGNED NOT NULL,
  `catering` tinyint(1) UNSIGNED NOT NULL,
  `delivery` tinyint(1) UNSIGNED NOT NULL,
  `credit_cards` mediumtext DEFAULT NULL,
  `wheelchair_access` tinyint(1) UNSIGNED NOT NULL,
  `wifi` tinyint(1) UNSIGNED NOT NULL,
  `address_2` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `restrict_checkin` tinyint(1) UNSIGNED NOT NULL,
  `checkin_start` datetime NOT NULL,
  `checkin_end` datetime NOT NULL,
  `slaughter_method` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `website` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `cash_only` tinyint(1) UNSIGNED NOT NULL,
  `sponsored` tinyint(1) UNSIGNED NOT NULL,
  `country` mediumtext DEFAULT NULL,
  `rating` varchar(255) DEFAULT NULL,
  `review_count` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `followers` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `following` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `total_ratings` mediumtext DEFAULT NULL,
  `parking` mediumtext DEFAULT NULL,
  `photo_count` mediumtext DEFAULT NULL,
  `timezone` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `permalink` mediumtext DEFAULT NULL,
  `created_app_user` tinyint(1) UNSIGNED NOT NULL,
  `featured_heading` mediumtext DEFAULT NULL,
  `featured` tinyint(1) UNSIGNED NOT NULL,
  `related` mediumtext DEFAULT NULL,
  `start_date` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `end_date` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `pork` tinyint(1) UNSIGNED NOT NULL,
  `enable_order` tinyint(1) UNSIGNED NOT NULL,
  `associated_listings` mediumtext DEFAULT NULL,
  `platforms` mediumtext DEFAULT NULL,
  `booking` mediumtext DEFAULT NULL,
  `booking_slot_value` mediumtext DEFAULT NULL,
  `is_online` tinyint(1) UNSIGNED NOT NULL,
  `offline_record_time` mediumtext DEFAULT NULL,
  `enable_order_print` tinyint(1) UNSIGNED NOT NULL,
  `adjust_platform_fee` tinyint(1) UNSIGNED NOT NULL,
  `delivery_fee_discount` mediumtext DEFAULT NULL,
  `enable_stripe` tinyint(1) UNSIGNED NOT NULL,
  `amenities` mediumtext DEFAULT NULL,
  `order_online_link` mediumtext DEFAULT NULL,
  `restHash` mediumtext DEFAULT NULL,
  `halal_authority` mediumtext DEFAULT NULL,
  `mobile_phone` mediumtext DEFAULT NULL,
  `shisha` mediumtext DEFAULT NULL,
  `transit` mediumtext DEFAULT NULL,
  `price` mediumtext DEFAULT NULL,
  `drive_thru` mediumtext DEFAULT NULL,
  `reservations` mediumtext DEFAULT NULL,
  `outdoor_seating` mediumtext DEFAULT NULL,
  `prayer` mediumtext DEFAULT NULL,
  `restrooms` mediumtext DEFAULT NULL,
  `ownedBy` mediumtext DEFAULT NULL,
  `halal_info` mediumtext DEFAULT NULL,
  `comments` mediumtext DEFAULT NULL,
  `description_halal` mediumtext DEFAULT NULL,
  `parking_zhalal` mediumtext DEFAULT NULL,
  `wheelchair` mediumtext DEFAULT NULL,
  `closedDate` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `closedByUserNum` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `halal_options` mediumtext DEFAULT NULL,
  `halal_chain` mediumtext DEFAULT NULL,
  `alcohol_options` mediumtext DEFAULT NULL,
  `capacity` mediumtext DEFAULT NULL,
  `to_go` mediumtext DEFAULT NULL,
  `demographics` mediumtext DEFAULT NULL,
  `kitchen` mediumtext DEFAULT NULL,
  `halal_menu` mediumtext DEFAULT NULL,
  `featured_tiles` mediumtext DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `muzzhub`
--

INSERT INTO `muzzhub` (`id`, `yelp_verified`, `created_at`, `createdByUserNum`, `updated_at`, `updatedByUserNum`, `name`, `address`, `city`, `state`, `zip`, `longitude`, `latitude`, `description`, `type`, `phone`, `email`, `monday_open`, `monday_close`, `tuesday_open`, `tuesday_close`, `wednesday_open`, `wednesday_close`, `thursday_open`, `thursday_close`, `friday_open`, `friday_close`, `saturday_open`, `saturday_close`, `sunday_open`, `sunday_close`, `cuisine`, `compliance`, `alcohol`, `halal_items`, `kids_menu`, `pray_space`, `organic`, `catering`, `delivery`, `credit_cards`, `wheelchair_access`, `wifi`, `address_2`, `restrict_checkin`, `checkin_start`, `checkin_end`, `slaughter_method`, `website`, `cash_only`, `sponsored`, `country`, `rating`, `review_count`, `followers`, `following`, `total_ratings`, `parking`, `photo_count`, `timezone`, `permalink`, `created_app_user`, `featured_heading`, `featured`, `related`, `start_date`, `end_date`, `pork`, `enable_order`, `associated_listings`, `platforms`, `booking`, `booking_slot_value`, `is_online`, `offline_record_time`, `enable_order_print`, `adjust_platform_fee`, `delivery_fee_discount`, `enable_stripe`, `amenities`, `order_online_link`, `restHash`, `halal_authority`, `mobile_phone`, `shisha`, `transit`, `price`, `drive_thru`, `reservations`, `outdoor_seating`, `prayer`, `restrooms`, `ownedBy`, `halal_info`, `comments`, `description_halal`, `parking_zhalal`, `wheelchair`, `closedDate`, `closedByUserNum`, `halal_options`, `halal_chain`, `alcohol_options`, `capacity`, `to_go`, `demographics`, `kitchen`, `halal_menu`, `featured_tiles`) VALUES
(1, 0, '2001-03-01 00:00:00', 122, '2024-03-06 13:33:16', 1, 'Aegean Grill', '1403 Solano Avenue', 'Albany', 'CA', '94706', '-122.2899996', '37.8909868', '', 'places', '15105599988', '', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	Turkish	', 'Unverified', 1, '', 0, 0, 0, 0, 0, '', 0, 0, '', 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', '', '', 0, 0, 'us', '4.0', '4', '0', '', '', '0', '', '', 'places/aegean-grill', 0, NULL, 0, '', '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 1, '', NULL, '', '', 0, '', 0, 0, '', 0, '', '', 'YqsVUgGE12', '0', '', '0', '0', '2', '0', '0', '0', '0', '0', '0', '', '', '', '', '', '2007-05-11 00:00:00', '0000-00-00 00:00:00', '', '0', '', '', '0', '', '', '2', '	'),
(2, 0, '2001-01-31 00:00:00', 122, '2015-07-04 11:36:29', 0, 'Rosalie\'s', '1448 High Street', 'Oakland', 'CA', '94601', '-122.21440248191357', '37.77261883020401', '', 'places', '15105328955', '', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	American	', NULL, 0, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '', 0, 0, 'us', '3.0', '2', '0', NULL, NULL, '0', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'rQW4OJ76kD', '0', '', '0', '0', '1', '0', '0', '0', '0', '0', '0', '', '', '', NULL, NULL, '2014-01-06 23:30:48', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, '0', NULL, NULL, '3', '	'),
(3, 0, '1999-09-15 00:00:00', 122, '2021-05-26 11:11:42', 0, 'Five Star Pizza & Deli', '3109 Telegraph Avenue', 'Oakland', 'CA', '94609', '-122.2670568', '37.8202074', 'Located in a small block of Muslim-owned businesses near the 31st street masjid, Five Star offers typical American fare plus some meat and rice dishes.', 'places', '15104282211', '', '10', '21', '10', '21', '10', '21', '10', '21', '10', '21', '10', '21', '10', '21', '	American	Italian	', 'Halal sign visible', 0, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, '', 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '', 0, 0, 'us', '3.5', '16', '3', NULL, NULL, '0', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'kolv7ALsEI', '0', '', '0', '1', '2', '0', '0', '0', '2', '1', '0', '', '', '', NULL, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, '1', NULL, NULL, '3', '	51	23	'),
(4, 0, '1999-06-30 00:00:00', 122, '0000-00-00 00:00:00', 0, 'Caribbean Spice', '1920 San Pablo Avenue', 'Berkeley', 'CA', '94702-1612', '-122.29263', '37.870038', NULL, 'places', '15108433035', NULL, '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	', NULL, 0, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '', 0, 0, 'us', '3.5', '2', '0', NULL, NULL, '', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'tp1MTl2Edq', NULL, NULL, NULL, '', '2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2007-05-11 00:00:00', '0000-00-00 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0', '	'),
(5, 0, '1999-06-30 00:00:00', 122, '2021-03-08 16:07:06', 0, 'Chaat Café', '1902 University Avenue', 'Berkeley', 'CA', '94704', '-122.2727231', '37.87138', 'A modern American Indian style restaurant, Chaat Café serves Indian or Pakistani dishes with an American touch. They use zhalal halal meat in all of their meat dishes.', 'places', '15108451431', 'info@chaatcafes.com', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	Pakistani	Indian	', 'Verbal confirmation', 1, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, '', 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, 'https://www.chaatcafes.com', 0, 0, 'us', '3.6', '9', '0', NULL, NULL, '0', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, '3GdPfeBeGS', '0', '', '0', '1', '2', '0', '0', '0', '0', '0', '0', '', '', '', NULL, NULL, '2024-01-29 12:25:36', '0000-00-00 00:00:00', NULL, '59', NULL, NULL, '1', NULL, NULL, '3', '	'),
(6, 0, '1999-06-30 00:00:00', 122, '2021-06-05 11:02:45', 0, 'Pamir Afghan Food', '5800 Shellmound Street', 'Emeryville', 'CA', '94608', '-122.29288769332578', '37.839409', 'Afghani Food inside a large food court.', 'places', '15106011152', '', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	Afghan	', 'Verbal confirmation', 0, NULL, 1, 0, 0, 0, 0, NULL, 1, 0, '', 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '', 0, 0, 'us', '3.5', '6', '0', NULL, NULL, '1', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'NFt4VswOrR', '0', '', '0', '1', '2', '0', '0', '0', '0', '0', '0', '', '', '', NULL, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, '0', NULL, NULL, '2', '	'),
(8, 0, '1999-06-30 00:00:00', 122, '2021-07-07 20:04:24', 0, 'Kabana', '1025 University Avenue', 'Berkeley', 'CA', '94710', '-122.2933227', '37.868942', 'A Berkeley institution, Kabana is the definitive Pakistani (read: spicy hot) restaurant in the East Bay. Recently relocated from 1106 University to a new and larger location a block away.', 'places', '15108453355', '', '10', '22', '10', '22', '10', '22', '10', '22', '10', '22', '10', '22', '10', '22', '	Pakistani	', 'Verbal confirmation', 0, NULL, 0, 0, 0, 0, 0, '	Visa	American Express	MasterCard	Debit', 1, 0, '', 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, 'https://www.thekabanarestaurant.com', 0, 0, 'us', '3.5', '36', '5', NULL, NULL, '1', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'eppsOqRyJb', '0', '', '0', '1', '1', '0', '2', '0', '3', '3', '0', '', '', '', NULL, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, '1', NULL, NULL, '3', '	'),
(9, 0, '1999-06-30 00:00:00', 122, '2015-08-17 13:59:33', 0, 'Priya', '2072 San Pablo Avenue', 'Berkeley', 'CA', '94702', '-122.2921076', '37.8681434', 'Formerly Larosh, Priya offers north and south Indian cuisine.', 'places', '15108486814', '', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	Indian	', NULL, 1, NULL, 0, 0, 0, 0, 0, NULL, 1, 0, NULL, 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, 'https://www.priyacuisine.com/', 0, 0, 'us', '4.0', '1', '0', NULL, NULL, '2', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'l8sBfiLlxb', '0', '', '0', '1', '1', '2', '2', '0', '3', '0', '0', '', '', '', NULL, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, '1', NULL, NULL, '2', '	'),
(10, 0, '1998-09-10 00:00:00', 122, '2021-07-07 20:04:38', 0, 'Julie\'s Café', '2562 Bancroft Way', 'Berkeley', 'CA', '94704', '-122.2576455', '37.8688985', 'A popular place with Berkeley students, Julie\'s Cafe offers a combination of Turkish, American and Thai food. Many MSA gatherings are scheduled here. Now under new ownership. Paid underground parking is available.', 'places', '15104868322', 'danilo.bosio@outlook.com', '7.5', '18.5', '7.5', '18.5', '7.5', '18.5', '7.5', '18.5', '7.5', '18.5', '10', '17', '10', '17', '	American	Thai	Turkish	', 'Verbal confirmation', 0, NULL, 1, 0, 0, 1, 1, NULL, 1, 0, '', 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, 'https://www.juliesberkeley.com', 0, 0, 'us', '3.9', '35', '7', NULL, NULL, '1', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'y08WS2kAaV', '0', '', '0', '1', '1', '0', '2', '0', '1', '4', '21621', 'From the management: \'All our menu is 100% halal,  however there is only 1 section that is 50/50 halal and that is SMOKED ITEMS that  are cook on the some smoking equipment but not touch each other.  Plus we have different utensils when we handle pork. We have some Muslim staff in our premises, and everything is taken very professional.\'', '', 'From the management: \'All our menu is 100% halal,  however there is only 1 section that is 50/50 halal and that is SMOKED ITEMS that  are cook on the some smoking equipment but not touch each other.  Plus we have different utensils when we handle pork. We have some Muslim staff in our premises, and everything is taken very professional.\'', NULL, NULL, '2010-01-02 00:00:00', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, '1', NULL, NULL, '2', '	'),
(11, 0, '1999-06-30 00:00:00', 122, '0000-00-00 00:00:00', 0, 'Meesha\'s Berkeley Gyros', '2519C Durant Avenue', 'Berkeley', 'CA', '94704-1761', '-122.258481', '37.868007', 'New owners - no longer halal.  Call and request they buy halal.', 'places', '15108494771', NULL, '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '11', '22', '	', NULL, 0, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, '0000-00-00 00:00:00', '0000-00-00 00:00:00', NULL, '', 0, 0, 'us', '4.2', '9', '0', NULL, NULL, '0', NULL, NULL, NULL, 0, NULL, 0, NULL, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 0, 0, NULL, NULL, NULL, NULL, 0, NULL, 0, 0, NULL, 0, NULL, NULL, 'w7mJeopwej', NULL, NULL, NULL, '0', '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2007-05-11 00:00:00', '0000-00-00 00:00:00', NULL, '0', NULL, NULL, NULL, NULL, NULL, '3', '	');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `muzzhub`
--
ALTER TABLE `muzzhub`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `muzzhub`
--
ALTER TABLE `muzzhub`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1100113;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
